from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import json

# === Load dataset ===
with open("data/coaching_millionaer_dataset.json", "r", encoding="utf-8") as f:
    docs = json.load(f)

# === Init embedding model ===
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# === Init Pinecone ===
pc = Pinecone(api_key="pcsk_6FCjSE_FFtwDN4PEY5Q7pqKGqGsNgBQrH2Ut9xWcpr3oe1FA28VDPFqei4XtpXMCwb7zdX")
index = pc.Index("ebook")

# === Upload data ===
vectors = []

for i, doc in enumerate(docs):
    # Handle multiple possible content keys safely
    content = (
        doc.get("content")
        or doc.get("text")
        or doc.get("context")
        or doc.get("paragraph")
    )

    if not content:
        print(f"⚠️ Skipping item {i} (no text field found)")
        continue

    emb = model.encode(content).tolist()
    vectors.append((str(i), emb, {"page": doc.get("page"), "context": content}))

    # Upload in batches
    if len(vectors) >= 100:
        index.upsert(vectors=vectors)
        print(f"✅ Uploaded {i + 1} documents...")
        vectors = []

# Upload remaining
if vectors:
    index.upsert(vectors=vectors)

print("🎉 Upload complete! All documents added to Pinecone.")
