# Facets Lifestyle CRM — AI Sales Copilot Platform

> **Stack:** React + Vite + TailwindCSS (Frontend) · FastAPI + SQLite (Backend) · DeepSeek AI + Deepgram STT

---

## 📋 Prerequisites — Install These First

Download and install in order:

| Tool | Download Link | Version |
|------|--------------|---------|
| **Git** | https://git-scm.com/download/win | Latest |
| **Node.js** | https://nodejs.org (LTS version) | 18+ |
| **Python** | https://www.python.org/downloads/ | 3.11+ |
| **VS Code** | https://code.visualstudio.com/ | Latest |

> ⚠️ **During Python install** → check ✅ **"Add Python to PATH"**

---

## 🔧 Recommended VS Code Extensions

Open VS Code → Press `Ctrl+Shift+X` → Search and install:

- `Python` (Microsoft)
- `Pylance`
- `ES7+ React/Redux/React-Native snippets`
- `Prettier - Code formatter`
- `Tailwind CSS IntelliSense`
- `GitLens`

---

## 🚀 Step-by-Step Setup

### Step 1 — Clone the Repository

Open **VS Code Terminal** (`Ctrl + `` ` ``) and run:

```powershell
git clone https://github.com/parshwebcraft/carbon-ai.git
cd carbon-ai
```

---

### Step 2 — Backend Setup (FastAPI + Python)

```powershell
# Go to backend folder
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# You should see (venv) at the start of your terminal line

# Install all Python packages
pip install -r requirements.txt
```

---

### Step 3 — Create Backend `.env` File

Inside the `backend` folder, create a new file called `.env`:

```powershell
# Still inside backend folder
copy NUL .env
```

Open `.env` in VS Code and paste this content:

```env
# ── Required ──────────────────────────────────────────
JWT_SECRET=your-super-secret-key-change-this-in-production

# ── DeepSeek AI (Required for all AI features) ────────
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
DEEPSEEK_MODEL=deepseek-chat

# ── Deepgram STT (Optional — for voice recording) ─────
# DEEPGRAM_API_KEY=your-deepgram-api-key-here

# ── WhatsApp Cloud API (Optional) ─────────────────────
# WHATSAPP_TOKEN=your-whatsapp-token
# WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
# WHATSAPP_VERIFY_TOKEN=your-verify-token

# ── Vapi Voice AI (Optional — for outbound calls) ─────
# VAPI_API_KEY=your-vapi-key
# VAPI_PHONE_NUMBER_ID=your-phone-number-id
```

> 💡 Replace `sk-your-deepseek-api-key-here` with your actual DeepSeek API key.
> Get it at: https://platform.deepseek.com

---

### Step 4 — Run the Backend Server

```powershell
# Make sure you are inside the backend folder with venv activated
# You should see (venv) in terminal

uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

✅ Backend is running when you see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

> 📌 **Keep this terminal open.** Open a new terminal for the next step.

---

### Step 5 — Frontend Setup (React)

Open a **new terminal** in VS Code (`Ctrl + Shift + `` ` ``):

```powershell
# Go to frontend folder
cd frontend

# Install Node packages
npm install
```

---

### Step 6 — Create Frontend `.env` File

Inside the `frontend` folder, create `.env`:

```powershell
copy NUL .env
```

Open it and paste:

```env
REACT_APP_API_URL=http://localhost:8001/api
REACT_APP_WS_URL=ws://localhost:8001
REACT_APP_API_HOST=localhost:8001
```

---

### Step 7 — Run the Frontend

```powershell
# Inside frontend folder
npm start
```

✅ Frontend is running when browser opens automatically at:
```
http://localhost:3000
```

---

## 🖥️ Running Both Servers (Daily Use)

Every time you open the project, you need **2 terminals**:

### Terminal 1 — Backend
```powershell
cd backend
venv\Scripts\activate
uvicorn server:app --reload
```

### Terminal 2 — Frontend
```powershell
cd frontend
npm start
```

---

## 🔐 Default Login Credentials

```
Email:    admin@facetscrm.com
Password: admin123
```

---

## 🌐 Application URLs

| Service | URL |
|---------|-----|
| **Frontend (CRM)** | http://localhost:3000 |
| **Backend API** | http://localhost:8001 |
| **API Docs (Swagger)** | http://localhost:8001/docs |
| **API Docs (ReDoc)** | http://localhost:8001/redoc |

---

## 📂 Project Structure

```
carbon-ai/
├── backend/                  # FastAPI Python backend
│   ├── routers/              # API route handlers
│   │   ├── ai.py             # AI endpoints (campaign draft, quotation suggest)
│   │   ├── copilot.py        # Copilot sessions + pipeline
│   │   ├── dashboard.py      # Dashboard stats + AI briefing
│   │   ├── leads.py          # Leads CRUD + AI score enrichment
│   │   ├── voice_ai.py       # Voice AI WebSocket (Deepgram + RAG)
│   │   └── ...
│   ├── services/             # Business logic + AI integrations
│   │   ├── deepseek.py       # DeepSeek API client
│   │   ├── deepgram_stt.py   # Deepgram Speech-to-Text
│   │   ├── rag_agent.py      # RAG context builder + AI analysis
│   │   ├── copilot.py        # Copilot suggestion engine
│   │   └── ...
│   ├── models.py             # SQLAlchemy database models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── server.py             # FastAPI app entry point
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # 🔒 Your secret keys (never commit this)
│
└── frontend/                 # React frontend
    ├── src/
    │   ├── pages/            # Page components
    │   │   ├── Copilot.jsx   # AI Sales Copilot (Phase 1 + 2 + Voice)
    │   │   ├── Dashboard.jsx # AI Command Centre dashboard
    │   │   ├── Leads.jsx     # Leads with AI score badges
    │   │   ├── Campaigns.jsx # Campaign manager
    │   │   ├── Quotations.jsx # Quotations with AI suggest
    │   │   └── ...
    │   ├── components/       # Reusable UI components
    │   │   ├── VoiceRecorder.jsx  # Mic capture + streaming
    │   │   └── ...
    │   └── lib/              # Utilities (api.js, format.js)
    ├── package.json
    └── .env                  # Frontend environment variables
```

---

## 🛠️ VS Code Tips for Windows

### Split Terminal (both servers side by side)
1. Open terminal: `Ctrl + `` ` ``
2. Click the **⊕ Split Terminal** icon (top right of terminal panel)
3. Run backend in left, frontend in right

### Open Two Folders
- `File → Add Folder to Workspace` → add both `backend` and `frontend`

### Useful Shortcuts
| Action | Shortcut |
|--------|----------|
| Open terminal | `Ctrl + `` ` `` |
| New terminal | `Ctrl + Shift + `` ` `` |
| Split terminal | `Ctrl + Shift + 5` |
| Find in files | `Ctrl + Shift + F` |
| Command palette | `Ctrl + Shift + P` |

---

## ❗ Troubleshooting

### ❌ `python` not recognized
```powershell
# Try instead:
python3 -m venv venv
```
Or reinstall Python with "Add to PATH" checked.

---

### ❌ `venv\Scripts\activate` blocked by PowerShell
```powershell
# Run this once to allow scripts:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then activate again:
```powershell
venv\Scripts\activate
```

---

### ❌ `npm install` fails
```powershell
# Clear cache and retry:
npm cache clean --force
npm install
```

---

### ❌ Port 3000 or 8001 already in use

Find and kill the process:
```powershell
# Check what's using port 8001
netstat -ano | findstr :8001

# Kill it (replace XXXX with the PID shown)
taskkill /PID XXXX /F
```

---

### ❌ Backend shows `DEEPSEEK_API_KEY not set`
- Open `backend/.env`
- Make sure the key is set: `DEEPSEEK_API_KEY=sk-xxxxx`
- Restart the backend server

---

### ❌ Database errors on first run
The SQLite database (`facets.db`) is created automatically on first run.
If you see migration errors:
```powershell
cd backend
venv\Scripts\activate
python -c "from database import Base, engine; import models; Base.metadata.create_all(engine); print('DB OK')"
```

---

## 🔄 Updating to Latest Code

```powershell
# Pull latest changes
git pull origin main

# Update backend packages
cd backend
venv\Scripts\activate
pip install -r requirements.txt

# Update frontend packages
cd ..\frontend
npm install
```

---

## 🚀 Features Overview

| Module | Route | AI Feature |
|--------|-------|-----------|
| **Dashboard** | `/` | Morning Briefing · Hot Leads · Conversion Forecast |
| **AI Copilot** | `/copilot` | Live BANT scoring · Product recs · Voice recording |
| **Leads** | `/leads` | AI score badge · Intent tag on every row |
| **Campaigns** | `/campaigns/:id` | AI message drafter · Tone selector |
| **Quotations** | `/quotations` | AI product suggestions by lead profile |
| **WhatsApp** | `/whatsapp` | Conversation analysis · Reply suggestions |
| **Calls** | `/calls` | Call intelligence · Sentiment · Next action |
| **Pipeline** | `/copilot → Pipeline` | Batch AI scoring · Follow-up engine |

---

## 📞 API Keys Reference

| Key | Where to Get | Free Tier |
|-----|-------------|-----------|
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com | Yes (pay per token, very cheap) |
| `DEEPGRAM_API_KEY` | https://console.deepgram.com | Yes (45,000 min/month) |
| `VAPI_API_KEY` | https://vapi.ai | Yes (trial credits) |
| `WHATSAPP_TOKEN` | https://developers.facebook.com | Free (needs Meta Business account) |

---

*Built with ❤️ for Facets Lifestyle Jewellery CRM*
