
from retriever.bm25_retriever import BM25Retriever
from qa.biobert_qa import BioBERTAnswerExtractor

def main():
    # Initialize retriever and QA model
    retriever = BM25Retriever("data/medquad_cleaned.json")
    qa = BioBERTAnswerExtractor()

    print("\n🩺 MedBot is ready! Type your question or 'exit' to quit.")

    while True:
        question = input("\nAsk a medical question: ").strip()
        if question.lower() in {"exit", "quit"}:
            print("👋 Goodbye!")
            break

        # Step 1: Retrieve top 3 passages
        results = retriever.retrieve(question, top_k=3)

        # Step 2: Run BioBERT on each passage
        print("\n🔍 Best answers:")
        for idx, item in enumerate(results, 1):
            context = item["context"]
            answer = qa.extract_answer(question, context)
            print(f"\nResult {idx}")
            print(f"Q: {item['title']}")
            print(f"A: {answer}")
            print(f"Source: {item['source']} (BM25 Score: {item['score']:.2f})")

if __name__ == "__main__":
    main()
