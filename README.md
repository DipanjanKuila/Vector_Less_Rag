# 🧠 VectorLess RAG

A full-stack **Retrieval-Augmented Generation (RAG)** system that works **without vector embeddings**. Instead of traditional vector search, it uses **PageIndex** to build a semantic document tree and leverages **LLM-guided tree traversal** to find the most relevant content — making it faster, simpler, and embedding-free.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Frontend                      │
│              (Vite + TypeScript + Tailwind)              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP
┌─────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend                        │
│                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │  /upload    │   │    /ask      │   │  /documents │  │
│  │  document   │   │   (RAG Q&A)  │   │  /tree      │  │
│  └──────┬──────┘   └──────┬───────┘   └─────────────┘  │
│         │                 │                             │
│  ┌──────▼──────┐   ┌──────▼───────┐                    │
│  │  PageIndex  │   │  Groq LLM    │                    │
│  │  (Doc Tree) │   │  (llama-3.3) │                    │
│  └──────┬──────┘   └──────────────┘                    │
│         │                                               │
│  ┌──────▼──────┐                                        │
│  │  PostgreSQL │                                        │
│  │  (Tree JSON)│                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ How It Works

Traditional RAG splits documents into chunks and stores them as vectors. **VectorLess RAG** takes a different approach:

1. **Upload** — A PDF is submitted to PageIndex, which parses it into a hierarchical semantic tree (chapters → sections → paragraphs)
2. **Store** — The tree JSON is saved in PostgreSQL (no vector DB needed)
3. **Query** — When a question is asked, the LLM navigates the tree to identify the most relevant nodes
4. **Answer** — The content of those nodes is passed as context to the LLM to generate a precise answer

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Python |
| LLM | Groq (llama-3.3-70b-versatile) |
| Document Parsing | PageIndex |
| Database | PostgreSQL |

---

## 📁 Project Structure

```
app/
├── app.py                  # FastAPI backend — all API endpoints
├── config.py               # Environment variable loader & validation
├── requirements.txt        # Python dependencies
├── .env.sample             # Sample environment variables
└── frontend/
    └── documind-assistant/ # React frontend
        ├── src/
        │   ├── components/ # UI components
        │   ├── pages/      # App pages
        │   └── lib/        # API client & utilities
        └── package.json
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.9+
- Node.js 18+ / Bun
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/DipanjanKuila/Vector_Less_Rag.git
cd Vector_Less_Rag/app
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.sample .env
# Edit .env with your credentials
```

### 3. Configure `.env`

```env
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

PAGEINDEX_API_KEY=your_pageindex_api_key
GROQ_API_KEY=your_groq_api_key

UPLOAD_DIR=./uploads
```

### 4. Run the Backend

```bash
uvicorn app:app --reload
```

Backend runs at `http://localhost:8000`

### 5. Frontend Setup

```bash
cd frontend/documind-assistant

# Install dependencies
npm install   # or bun install

# Start dev server
npm run dev   # or bun dev
```

Frontend runs at `http://localhost:5173`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload-document` | Upload a PDF and build its semantic tree |
| `POST` | `/ask` | Ask a question against a document |
| `GET` | `/documents` | List all uploaded documents |
| `GET` | `/document-tree/{id}` | Get the full semantic tree of a document |

### Example: Ask a Question

```bash
curl -X POST "http://localhost:8000/ask?document_id=<uuid>&query=What is the main topic?"
```

---

## 🔑 API Keys

| Service | Get it from |
|---------|------------|
| **Groq** | [console.groq.com](https://console.groq.com) |
| **PageIndex** | [pageindex.ai](https://pageindex.ai) |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ using FastAPI, React & Groq
</div>
