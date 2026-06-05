# ChatGlobe — Real-Time Chat with AI Translation

A full-stack real-time messaging platform where users chat in their own language and every message is automatically translated using Hugging Face ML models. Built as a production-intent system with a Python ML microservice, WebSocket event-driven architecture, and semantic search powered by sentence embeddings.

---

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────────┐
│   React + Vite  │ ◄─────────────────► │  Node.js + Express   │
│   (Frontend)    │     REST (axios)    │  + Socket.io         │
└─────────────────┘ ────────────────►  │  (Backend :5000)     │
                                        └──────────┬───────────┘
                                                   │ HTTP
                                                   ▼
                                        ┌──────────────────────┐
                                        │  Python FastAPI      │
                                        │  ML Service (:8000)  │
                                        │                      │
                                        │  • MarianMT (HF)     │
                                        │  • langdetect        │
                                        │  • sentence-xformers │
                                        │  • Vector Store      │
                                        └──────────────────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │  MongoDB Atlas       │
                                        │  (Users, Rooms,      │
                                        │   Messages)          │
                                        └──────────────────────┘
```

---

## Features

### Real-Time Messaging
- Sub-200ms message delivery via WebSockets (Socket.io)
- Typing indicators, join/leave notifications
- Persistent message history (last 50 messages loaded on room join)
- Multiple chat rooms — pre-seeded General, Tech, Random + user-created rooms

### AI-Powered Translation
- **Hugging Face Helsinki-NLP MarianMT** models — translation runs locally, no external API call for supported language pairs
- **DeepL API fallback** — automatically used when no HF model exists for a language pair
- **LRU translation cache** — avoids re-translating identical text, reduces latency to ~0ms on cache hits
- Per-user preferred language — set once on signup, all messages auto-translate into your language
- Language can be changed live from the sidebar dropdown

### ML Microservice (Python FastAPI)
- **Language detection** via `langdetect` (statistical ML model, runs entirely locally)
- **Sentence embeddings** via `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Semantic search** — find past messages by meaning using cosine similarity over embedding vectors (RAG-lite)
- **Observability endpoint** — real-time metrics: translation latency, p95, cache hit rate, model source distribution, vector store stats
- Fully decoupled: chat works without the ML service, translation falls back to DeepL gracefully

### Authentication
- JWT-based auth (7-day expiry)
- Bcrypt password hashing
- Protected routes on both frontend and Socket.io connection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Socket.io-client |
| Backend | Node.js, Express, Socket.io |
| ML Service | Python 3.11, FastAPI, Uvicorn |
| Translation | Hugging Face `Helsinki-NLP/opus-mt-*` (MarianMT) |
| Embeddings | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| Language Detection | `langdetect` |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcryptjs |
| Deployment | Railway |

---

## Project Structure

```
chat-app-translation/
├── backend/                  # Node.js + Express + Socket.io
│   ├── models/               # Mongoose schemas (User, Room, Message)
│   ├── routes/               # REST API (auth, rooms, messages, translate, search)
│   ├── services/
│   │   ├── socketHandler.js  # WebSocket event logic
│   │   └── mlClient.js       # HTTP client for Python ML service
│   └── server.js
│
├── frontend/                 # React + Vite
│   └── src/
│       ├── components/       # Sidebar, ChatWindow, MessageInput, SearchBar, MetricsPanel
│       ├── context/          # AuthContext, SocketContext
│       └── pages/            # Login, Register, Chat
│
├── ml-service/               # Python FastAPI ML microservice
│   ├── routers/              # /translate, /detect, /search, /metrics
│   ├── services/
│   │   ├── model_registry.py # Hugging Face model loader + cache
│   │   ├── translator.py     # MarianMT + DeepL fallback
│   │   ├── detector.py       # langdetect wrapper
│   │   ├── vector_store.py   # In-memory embedding store + cosine search
│   │   └── metrics_store.py  # Latency, cache hit, model source tracking
│   └── main.py
│
└── docker-compose.yml        # Run all 3 services together
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (free tier)
- DeepL API key (free tier — 500K chars/month)

### Step 1 — Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/chat-app-translation.git
cd chat-app-translation
```

Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=your_secret_key
DEEPL_API_KEY=your_deepl_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

Create `ml-service/.env`:
```env
DEEPL_API_KEY=your_deepl_key
PORT=8000
```

### Step 2 — Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# ML Service
cd ../ml-service && pip install -r requirements.txt
```

### Step 3 — Start all three services

**Terminal 1 — ML Service** *(first run downloads ~500MB of models)*
```bash
cd ml-service
python -m uvicorn main:app --port 8000 --reload
```

**Terminal 2 — Backend**
```bash
cd backend
npm run dev
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> Chat works without the ML service running — translation falls back to DeepL automatically.

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with preferred language |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/language` | Update preferred language |
| GET | `/api/rooms` | List all rooms |
| POST | `/api/rooms` | Create a room |
| GET | `/api/messages/:roomId` | Get history (pre-translated) |
| POST | `/api/translate` | Translate text via ML service |
| GET | `/api/search/messages` | Semantic search in a room |
| GET | `/api/search/ml-metrics` | ML observability metrics |

### WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `join-room` | Client → Server | Join a chat room |
| `send-message` | Client → Server | Send a message |
| `typing` | Client → Server | Typing indicator |
| `message` | Server → Client | New message broadcast |
| `room-users` | Server → Client | Online users in room |
| `user-typing` | Server → Client | Someone is typing |

---

## ML Service Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/translate/` | Translate text (HF → DeepL fallback) |
| POST | `/detect/` | Detect language with confidence score |
| POST | `/search/index` | Index a message embedding |
| POST | `/search/query` | Semantic similarity search |
| GET | `/metrics/` | Observability snapshot |
| GET | `/health` | Health check |

---

## Deployment (Railway)

1. Push to GitHub
2. New Railway project → **Deploy from GitHub**
3. Add environment variables (from `.env.example`)
4. Add **MongoDB** plugin from Railway marketplace
5. Railway runs `railway.toml` build command automatically

---

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Turkish, Polish, Dutch, Ukrainian, and more via DeepL fallback.
