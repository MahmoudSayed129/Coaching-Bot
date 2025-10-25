import json
import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.preprocessing import normalize


class FAISSRetriever:
    def __init__(self, data_path="data/coaching_millionaer_dataset.json"):
        """
        Multilingual FAISS retriever for the 'Coaching Millionär' dataset.
        Supports English and German queries.
        """
        self.data_path = data_path
        self.index_path = "data/faiss_index.bin"
        self.meta_path = "data/faiss_metadata.json"

        # ✅ multilingual model (English + German + 50+ languages)
        self.model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

        # optional reranker for better precision
        self.reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

        # Load existing FAISS index or build new one
        if os.path.exists(self.index_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            print("✅ Loaded existing FAISS index.")
        else:
            self._build_index()

    def _build_index(self):
        """Build and save FAISS index from dataset."""
        with open(self.data_path, "r", encoding="utf-8") as f:
            dataset = json.load(f)

        texts = [item["text"] for item in dataset]
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
        embeddings = normalize(embeddings)

        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(embeddings)

        self.metadata = dataset
        os.makedirs("data", exist_ok=True)
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False)

        print(f"✅ Built new FAISS index from {len(texts)} passages.")

    def retrieve(self, question, top_k=10):
        """
        Retrieve relevant passages from the FAISS index.
        Automatically boosts results mentioning key entities like 'Javid Niazi-Hoffmann'.
        """
        query_vec = self.model.encode([question], convert_to_numpy=True)
        query_vec = normalize(query_vec)

        scores, indices = self.index.search(query_vec, top_k)
        results = []

        # small keyword boost for known entities
        boost_keywords = ["Javid", "Niazi", "Hoffmann", "Coaching", "Millionär"]
        for idx, score in zip(indices[0], scores[0]):
            if idx < len(self.metadata):
                item = self.metadata[idx]
                text = item["text"]
                boost = any(k.lower() in text.lower() for k in boost_keywords)
                final_score = float(score * 100 + (5 if boost else 0))
                results.append({
                    "page": item.get("page", ""),
                    "context": text,
                    "score": final_score
                })

        # ✅ Rerank using cross-encoder for higher accuracy
        if results:
            pairs = [(question, r["context"]) for r in results]
            rerank_scores = self.reranker.predict(pairs)
            results = [
                {**r, "rerank_score": float(s)}
                for r, s in zip(results, rerank_scores)
            ]
            results = sorted(results, key=lambda x: x["rerank_score"], reverse=True)[:top_k]

        return results
