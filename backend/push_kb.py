from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import json
import os

# === CONFIG ===

# Paths to your KB JSON files
KB_FILES = [
    ("jp_kb_videos_chunks_large.json", "sales_video"),
    ("jp_kb_mindset_calls_chunks_large.json", "mindset_call"),
    ("jp_kb_mc_strategie_calls_chunks_large.json", "mc_strategie_call"),
]

PINECONE_API_KEY = "pcsk_4HJkxk_7bdo3VUJmyNCoTb2rseZ8A6qQ9u9uUhUksjiPWgSQPbvLYaKNjm8NnULQSam4F9"
INDEX_NAME = "ebook"                         # your existing index name
BATCH_SIZE = 100


# === Load dataset from the three JSONs ===

docs = []

for filename, source in KB_FILES:
    path = os.path.join(".", filename)  # same folder as script, adjust if needed

    if not os.path.exists(path):
        print(f"⚠️ File not found, skipping: {path}")
        continue

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        content = item.get("context")
        if not content:
            continue

        docs.append(
            {
                "content": content,
                "page": item.get("page"),
                "source": source,
            }
        )

print(f"Loaded {len(docs)} documents from KB JSON files.")


# === Init embedding model ===


model = SentenceTransformer("./model")



# === Init Pinecone ===

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)


# === Upload data ===

vectors = []

for i, doc in enumerate(docs):
    content = doc["content"]
    # Create embedding
    emb = model.encode(content).tolist()

    # Metadata stored with each vector
    metadata = {
        "page": doc.get("page"),
        "source": doc.get("source"),
        "context": content,   # optional, but handy for debugging / display
    }

    # ID is just a running index; you can change to something else if you prefer
    vectors.append((str(i+300), emb, metadata))

    # Upload in batches
    if len(vectors) >= BATCH_SIZE:
        index.upsert(vectors=vectors)
        print(f"✅ Uploaded {i + 1} documents...")
        vectors = []

# Upload remaining
if vectors:
    index.upsert(vectors=vectors)
    print(f"✅ Uploaded final {len(vectors)} documents.")

print("🎉 Upload complete! All KB documents added to Pinecone.")
