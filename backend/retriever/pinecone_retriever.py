from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

class PineconeRetriever:
    def __init__(self, api_key: str, index_name: str):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        self.pinecone = Pinecone(api_key=api_key)
        self.index = self.pinecone.Index(index_name)

    def retrieve(self, query: str, top_k: int = 5):
        query_emb = self.model.encode(query).tolist()
        results = self.index.query(vector=query_emb, top_k=top_k, include_metadata=True)
        matches = results.get("matches", [])
        docs = []
        for match in matches:
            meta = match["metadata"]
            docs.append({
                "content": meta.get("context", ""),
                "page": meta.get("page"),
                "score": match.get("score")
            })
        return docs
