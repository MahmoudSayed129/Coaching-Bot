
import pandas as pd
import json
import os

# Input and output paths
input_csv_path = "data/medquad.csv"
output_json_path = "data/medquad_cleaned.json"

# Make sure output directory exists
os.makedirs(os.path.dirname(output_json_path), exist_ok=True)

# Load CSV
df = pd.read_csv(input_csv_path)

# Basic cleaning
df.dropna(subset=["question", "answer"], inplace=True)
df["question"] = df["question"].str.strip()
df["answer"] = df["answer"].str.strip()
df["source"] = df["source"].fillna("").str.strip()
df.drop_duplicates(subset=["question", "answer"], inplace=True)

# Convert to list of dicts
cleaned_data = [
    {
        "title": row["question"],
        "context": row["answer"],
        "source": row["source"]
    }
    for _, row in df.iterrows()
]

# Save as JSON
with open(output_json_path, "w", encoding="utf-8") as f:
    json.dump(cleaned_data, f, indent=2)

print(f"✅ Cleaned data saved to: {output_json_path}")
