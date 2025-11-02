import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from langdetect import detect
from deep_translator import GoogleTranslator
import subprocess

# Patch huggingface_hub automatically if Gradio overwrote it
try:
    import huggingface_hub
    if not hasattr(huggingface_hub, "cached_download"):
        subprocess.run(
            ["pip", "install", "--no-cache-dir", "huggingface-hub==0.24.5", "transformers==4.30.2", "sentence-transformers==2.2.2"],
            check=True
        )
        print("✅ Downgraded huggingface-hub for sentence-transformers compatibility.")
except Exception as e:
    print("⚠️ Could not auto-patch huggingface_hub:", e)
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

# ---------- Config ----------
DATASET_PATH = "data/coaching_millionaer_dataset.json"
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")  # Add this to your .env
PINECONE_INDEX_NAME = "ebook"

# ---------- App ----------
app = Flask(__name__)
CORS(app, resources={r"/ask": {"origins": "*"}})

# ---------- OpenAI Client ----------
client = None
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
else:
    print("⚠️  OPENAI_API_KEY is missing in .env")

# ---------- Retriever ----------
retriever = None
try:
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY missing in .env")

    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    class PineconeRetriever:
        def __init__(self, index, embedder):
            self.index = index
            self.embedder = embedder

        def retrieve(self, query, top_k=10):
            emb = self.embedder.encode(query).tolist()
            res = self.index.query(vector=emb, top_k=top_k, include_metadata=True)
            matches = res.get("matches", [])
            results = []
            for match in matches:
                meta = match.get("metadata", {})
                results.append({
                    "context": meta.get("context", ""),
                    "page": meta.get("page"),
                    "score": match.get("score", 0)
                })
            return results

    retriever = PineconeRetriever(index, embedder)
    print("✅ Pinecone retriever initialized successfully.")
except Exception as e:
    print("❌ Retriever initialization failed:", e)
    traceback.print_exc()

# ---------- Translator ----------
def translate_text(text: str, target_lang: str) -> str:
    """Translate text using deep-translator (GoogleTranslator)."""
    try:
        return GoogleTranslator(source="auto", target=target_lang).translate(text)
    except Exception:
        return text

# ---------- Helpers ----------
def detect_language(question: str) -> str:
    """Detect the user's language without translation."""
    try:
        return detect(question)
    except Exception:
        return "unknown"

def normalize_language(lang: str, text: str) -> str:
    """Fix incorrect language detection like 'wer is' → German."""
    if lang == "nl" and any(word in text.lower() for word in ["wer", "was", "wie", "javid", "coaching"]):
        return "de"
    return lang

def system_prompt_book_only() -> str:
    return (
        "You are CoachingBot, a professional mentor trained on the book 'Coaching Millionär' by Javid Niazi-Hoffmann. "
        "Use only the provided book context to answer the question. "
        "If the user asks about people like Javid Niazi-Hoffmann, describe them factually using the book content. "
        "Mention page numbers where possible. "
        "If the context is not relevant, say you don’t have that information in the book and provide a general, helpful answer. "
        "Always respond in the same language as the user's question, even if the book content is in another language."
    )

def system_prompt_fallback() -> str:
    return (
        "You are CoachingBot, a helpful business and life mentor. "
        "The question cannot be answered from the book, so answer using your general coaching knowledge. "
        "Always respond in the same language as the user's question, even if the book content is in another language. "
        "Do not invent book citations."
    )

def format_answers(question: str, answer: str, results):
    pages = [f"Seite {r.get('page', '')}" for r in results if r.get("page")]
    source = ", ".join(pages) if pages else "No source"
    top_score = max([r.get("score", 0.0) for r in results], default=0.0)
    return {"answers": [{"question": question, "answer": answer, "source": source, "bm25_score": top_score}]}

# ---------- Routes ----------
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "retriever_ready": bool(retriever),
        "openai_key_loaded": bool(OPENAI_API_KEY),
        "pinecone_key_loaded": bool(PINECONE_API_KEY),
        "index_name": PINECONE_INDEX_NAME
    })

@app.route("/ask", methods=["POST", "OPTIONS"])
def ask():
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        data = request.get_json(force=True) or {}
        question = (data.get("question") or "").strip()
    except Exception:
        return jsonify(format_answers("", "Invalid JSON request", [])), 200

    if not question:
        return jsonify(format_answers("", "Please enter a question.", [])), 200

    print(f"\n--- User Question ---\n{question}")

    # Detect and normalize language
    user_lang = normalize_language(detect_language(question), question)
    print(f"Detected language: {user_lang}")

    # Retrieve context
    context, results = "", []
    try:
        raw_results = retriever.retrieve(question)
        MIN_SCORE = 0.10  # Pinecone similarity scores are normalized (0–1)
        results = [r for r in raw_results if r.get("score", 0) >= MIN_SCORE]
        if results:
            context = "\n\n---\n\n".join(
                [f"(Seite {r['page']}) {r['context']}" for r in results]
            )
    except Exception as e:
        traceback.print_exc()
        return jsonify(format_answers(question, f"Retriever error: {e}", [])), 200

    # Build prompts
    if context:
        sys_prompt = system_prompt_book_only()
        user_content = f"Question: {question}\n\nBook context:\n{context}"
    else:
        sys_prompt = system_prompt_fallback()
        user_content = question

    # Query GPT
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_content}
            ],
            max_tokens=700,
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        traceback.print_exc()
        return jsonify(format_answers(question, f"⚠️ OpenAI call failed: {e}", [])), 200

    return jsonify(format_answers(question, answer, results))

from flask import send_file
import tempfile

@app.route("/voice", methods=["POST"])
def voice_chat():
    try:
        audio = request.files.get("audio")
        if not audio:
            return jsonify({"error": "No audio file uploaded"}), 400

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            audio.save(tmp.name)
            audio_path = tmp.name

        # Step 1️⃣: Transcribe using OpenAI Whisper or any STT
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=open(audio_path, "rb")
        )
        text = transcription.text.strip()
        print(f"🎤 Transcribed: {text}")

        # Step 2️⃣: Get mentoring answer from your existing /ask logic
        data = {"question": text}
        with app.test_request_context(json=data):
            response = ask()
        response_json = response.get_json()

        # Step 3️⃣: Optional TTS response
        answer_text = response_json["answers"][0]["answer"]
        speech_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        with client.audio.speech.with_streaming_response.create(
            model="gpt-4o-mini-tts",
            voice="alloy",
            input=answer_text
        ) as speech:
            speech.stream_to_file(speech_file.name)

        return jsonify({
            "transcript": text,
            "answer": answer_text,
            "audio_url": f"/audio/{os.path.basename(speech_file.name)}"
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/audio/<filename>")
def serve_audio(filename):
    return send_file(os.path.join(tempfile.gettempdir(), filename), mimetype="audio/mpeg")

# ---------- Run ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"🚀 Server started on port {port}")
    app.run(host="0.0.0.0", port=port)
