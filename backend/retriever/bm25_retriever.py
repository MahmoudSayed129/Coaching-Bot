
import json
from rank_bm25 import BM25Okapi
import nltk
from nltk.tokenize import word_tokenize

nltk.download('punkt')

class BM25Retriever:
    def __init__(self, json_path):
        self.data = self.load_data(json_path)
        self.contexts = [item["context"] for item in self.data]
        self.tokenized_corpus = [word_tokenize(doc.lower()) for doc in self.contexts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    def load_data(self, path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def retrieve(self, query, top_k=5):
        tokenized_query = word_tokenize(query.lower())
        scores = self.bm25.get_scores(tokenized_query)
        top_k_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        results = []

        for i in top_k_indices:
            item = self.data[i]
            results.append({
                "score": scores[i],
                "title": item["title"],
                "context": item["context"],
                "source": item.get("source", "")
            })

        return results

# Example usage:
if __name__ == "__main__":
    retriever = BM25Retriever("data/medquad_cleaned.json")
    question = input("Ask a medical question: ")
    results = retriever.retrieve(question)

    for idx, result in enumerate(results, 1):
        print(f"\nResult {idx}")
        print(f"Score: {result['score']:.2f}")
        print(f"Question: {result['title']}")
        print(f"Answer: {result['context']}")
        print(f"Source: {result['source']}")
