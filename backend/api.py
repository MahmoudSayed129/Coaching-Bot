import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from langdetect import detect
from googletrans import Translator

# ---------- Import ----------
from retriever.faiss_retriever import FAISSRetriever

# ---------- Config ----------
DATASET_PATH = "data/coaching_millionaer_dataset.json"
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

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
try:
    retriever = FAISSRetriever(DATASET_PATH)
except Exception as e:
    print("❌ Retriever initialization failed:", e)
    retriever = None

translator = Translator()


# ---------- Helpers ----------
def detect_and_translate(question: str) -> tuple[str, str]:
    """Detect user language and translate to German if needed."""
    try:
        lang = detect(question)
        if lang != "de":
            translated = translator.translate(question, src=lang, dest="de").text
            return lang, translated
        return lang, question
    except Exception:
        return "unknown", question


def system_prompt_book_only() -> str:
    return (
        "You are CoachingBot, a professional mentor trained on the book 'Coaching Millionär' by Javid Niazi-Hoffmann. "
        "Use only the book context provided. If the user asks about people like Javid Niazi-Hoffmann, describe them "
        "factually using the book content. Mention page numbers where possible. "
        "If no relevant context is found, say you don’t have that information in the book and give a general helpful answer."
    )


def system_prompt_fallback() -> str:
    return (
        "You are CoachingBot, a helpful business and life mentor. "
        "The question cannot be answered from the book, so answer using your general coaching knowledge. "
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
        "dataset_path": DATASET_PATH
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

    # Detect language and translate if needed
    user_lang, question_for_retrieval = detect_and_translate(question)
    print(f"Detected language: {user_lang}")

    # Retrieve context from book
    context, results = "", []
    try:
        raw_results = retriever.retrieve(question_for_retrieval, top_k=10)
        MIN_SCORE = 35.0
        results = [r for r in raw_results if r.get("score", 0) >= MIN_SCORE]
        if results:
            context = "\n\n---\n\n".join(
                [f"(Seite {r['page']}) {r['context']}" for r in results]
            )
    except Exception as e:
        traceback.print_exc()
        return jsonify(format_answers(question, f"Retriever error: {e}", [])), 200

    # Build system and user prompts
    if context:
        sys_prompt = system_prompt_book_only()
        user_content = f"Frage: {question}\n\nKontext aus dem Buch:\n{context}"
    else:
        sys_prompt = system_prompt_fallback()
        user_content = question

    # Query LLM
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

    # Translate answer back if question wasn’t in German
    if user_lang != "de":
        try:
            answer = translator.translate(answer, src="de", dest=user_lang).text
        except Exception:
            pass

    return jsonify(format_answers(question, answer, results))


if __name__ == "__main__":
    print("Server started. Visit http://127.0.0.1:5000")
    app.run(debug=True)
