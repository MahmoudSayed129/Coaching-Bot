import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from langdetect import detect
from googletrans import Translator
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

# ---------- Config ----------
DATASET_PATH = "data/coaching_millionaer_dataset.json"
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")  # add this to your .env
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

translator = Translator()

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

# ---------- Run ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Server started on port {port}")
    app.run(host="0.0.0.0", port=port)
