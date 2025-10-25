
from transformers import AutoTokenizer, AutoModelForQuestionAnswering
import torch

class BioBERTAnswerExtractor:
    def __init__(self, model_name='dmis-lab/biobert-base-cased-v1.1-squad'):
        print("⏳ Loading BioBERT model...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForQuestionAnswering.from_pretrained(model_name)
        print("BioBERT model loaded.")

    def extract_answer(self, question, context):
        inputs = self.tokenizer.encode_plus(
            question, context,
            return_tensors='pt',
            truncation=True,
            max_length=512
        )

        with torch.no_grad():
            outputs = self.model(**inputs)
            start_scores = outputs.start_logits
            end_scores = outputs.end_logits

        start_idx = torch.argmax(start_scores)
        end_idx = torch.argmax(end_scores)

        if start_idx > end_idx:
            return ""  # invalid span

        all_tokens = self.tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
        answer_tokens = all_tokens[start_idx:end_idx + 1]
        answer = self.tokenizer.convert_tokens_to_string(answer_tokens).strip()

        # Filter out junk answers
        if not answer or answer.lower() in ["[cls]", "[sep]"] or len(answer) < 3:
            return ""  # signal to use fallback

        return answer


# Example usage
if __name__ == "__main__":
    qa = BioBERTAnswerExtractor()
    question = "What are the symptoms of flu?"
    context = "The flu can cause fever, cough, sore throat, muscle aches, fatigue, and chills."
    answer = qa.extract_answer(question, context)
    print(f"Answer: {answer}")
