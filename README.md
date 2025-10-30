# 🧠 J&P Mentoring Chatbot  

Your **AI-powered business mentoring assistant**, designed to guide users through personal and professional growth, goal setting, and entrepreneurial development.  

---

## 🚀 Overview  

The **J&P Mentoring Chatbot** is an intelligent conversational assistant built to mentor users on personal and business development topics. It leverages advanced natural language processing and retrieval mechanisms to provide meaningful, context-aware responses.  

The chatbot combines a **React-based front end**, a **Flask API backend**, and **Pinecone vector storage** for retrieval, with a **Hugging Face–hosted GPT model** for intelligent generation.  

---

## 🧩 Architecture  

```
[React Frontend (Vercel)]
          |
          ▼
[Flask Backend API]
          |
          ▼
[Retrieval: Pinecone Vector DB] ←→ [Hugging Face GPT Model]
```

### ⚙️ Flow:
1. **User Interaction:**  
   The user sends a question or request via the web UI (React + Vercel).  
2. **Backend Processing:**  
   Flask receives the query and performs a retrieval request to **Pinecone**, which stores pre-embedded mentoring/business-related data.  
3. **Context Retrieval:**  
   Relevant text chunks are fetched from Pinecone and passed as context.  
4. **Response Generation:**  
   The backend sends the context + query to a **Hugging Face GPT-based model** (deployed by the author).  
5. **Response Delivery:**  
   The model generates a guided mentoring answer and returns it to the React UI for display.  

---

## 🛠️ Tech Stack  

| Component | Technology | Description |
|------------|-------------|-------------|
| **Frontend** | [React.js](https://react.dev/) | User interface built and deployed via [Vercel](https://vercel.com) |
| **Backend** | [Flask](https://flask.palletsprojects.com/) | Lightweight Python API connecting UI, Pinecone, and Hugging Face |
| **Vector Store** | [Pinecone](https://www.pinecone.io/) | Used for storing and retrieving embedded text documents |
| **Model Hosting** | [Hugging Face](https://huggingface.co/) | GPT-based fine-tuned model for generating intelligent mentoring responses |
| **Deployment** | Vercel (Frontend) + Hugging Face (Model API) | Ensures scalability and global accessibility |

---

## 💡 Features  

✅ Personalized mentoring and guidance  
✅ Contextual knowledge retrieval from Pinecone  
✅ Natural and conversational GPT-based answers  
✅ Simple and elegant UI built with React  
✅ Deployed end-to-end for production use  

---

## 🧱 Project Structure  

```
jp-mentoring-chatbot/
│
├── frontend/                 # React app (Vercel)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/                  # Flask server
│   ├── app.py
│   ├── requirements.txt
│   └── utils/
│       ├── pinecone_handler.py
│       └── huggingface_api.py
│
├── README.md
└── .env.example              # Example environment variables
```

---

## ⚙️ Setup Instructions  

### 1. Clone the Repository  
```bash
https://github.com/MahmoudSayed129/Coaching-Bot.git
cd jp-mentoring-chatbot
```

### 2. Backend Setup (Flask)  
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file with your credentials:
```bash
PINECONE_API_KEY=your_pinecone_api_key
HUGGINGFACE_API_URL=your_model_endpoint
HUGGINGFACE_API_KEY=your_huggingface_key
```

Run the Flask server:
```bash
python app.py
```

### 3. Frontend Setup (React)  
```bash
cd ../frontend
npm install
npm start
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deployment  

- **Frontend:** Deployed on [Vercel](https://vercel.com)  
- **Model Backend:** Hosted on [Hugging Face Spaces / Inference API](https://huggingface.co)  
- **Vector Database:** Managed with [Pinecone Cloud](https://app.pinecone.io)  

---

## 📦 Environment Variables  

| Variable | Description |
|-----------|-------------|
| `PINECONE_API_KEY` | Your Pinecone API key |
| `PINECONE_ENVIRONMENT` | Pinecone project environment |
| `HUGGINGFACE_API_URL` | Your Hugging Face model endpoint |
| `HUGGINGFACE_API_KEY` | Hugging Face access token |

---

## 📚 Future Enhancements  

- Add authentication for user profiles  
- Track mentoring session history  
- Integrate speech-to-text input  
- Fine-tune GPT model with custom business coaching data  

---

## 👨‍💻 Author  

**J&P Mentoring**  
📧 [msayedm701@gmail.com](mailto:msayedm701@gmail.com)  
🌐 *Personal project for mentoring and business growth assistance*  
