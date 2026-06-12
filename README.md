# Facets Lifestyle Jewellery CRM — Windows 11 + VS Code Setup Guide

This README walks you, step by step, through installing and running the full
Facets Jewellery CRM (FastAPI backend + React 19 frontend + SQL database) on a
**fresh Windows 11 office computer using VS Code**.

You will end up with three things running locally:

| Service  | URL                          | What it is                          |
| -------- | ---------------------------- | ----------------------------------- |
| Backend  | http://localhost:8001        | FastAPI + Swagger docs at `/docs`   |
| Frontend | http://localhost:3000        | React app (auto-opens in browser)   |
| Database | local file *or* SQL Server   | SQLite (default) or MS SQL Server   |

> The default database is **SQLite** — a single file on disk, zero installation.
> Section 6 also shows how to switch to **Microsoft SQL Server** (Express) if
> your office IT policy requires it.

---

## 0. Time required

About **40 minutes** end-to-end on a fresh laptop. After the first install,
starting the app on subsequent days takes ~30 seconds.

---

## 1. Install the prerequisites

Open **PowerShell as Administrator** (Start → type "PowerShell" → right-click →
*Run as Administrator*) and run each block.

### 1.1 Install Chocolatey (Windows package manager — optional but easiest)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = `
  [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Close PowerShell and reopen it (still as Administrator) so `choco` is on the PATH.

### 1.2 Install Python 3.11, Node.js 20 LTS, Git, VS Code, Yarn

```powershell
choco install -y python311 nodejs-lts git vscode yarn
```

> **No Chocolatey?** Install each one manually from these official sites and
> tick *"Add to PATH"* on every installer:
> - Python 3.11 → https://www.python.org/downloads/windows/
> - Node.js 20 LTS → https://nodejs.org/en/download
> - Git → https://git-scm.com/download/win
> - VS Code → https://code.visualstudio.com/download
> - Yarn (after Node) → `npm install -g yarn`

### 1.3 Verify everything

Close and reopen PowerShell (a normal window is fine now), then:

```powershell
python --version       # 3.11.x
node --version         # v20.x
yarn --version         # 1.22.x
git --version
code --version
```

If any command fails with *"not recognized"*, sign out of Windows and sign back
in so the PATH refreshes, then re-check.

---

## 2. Get the project into VS Code

### 2.1 Pick a folder

```powershell
mkdir C:\Projects
cd C:\Projects
```

### 2.2 Place the source

**Option A — from the ZIP** (`carcon-ai-main.zip`):

1. Right-click the ZIP → **Extract All…** → choose `C:\Projects`.
2. You should now have `C:\Projects\carcon-ai-main\`.

**Option B — from Git** (if you have a Git repo URL):

```powershell
git clone <your-repo-url> carcon-ai-main
```

### 2.3 Open in VS Code

```powershell
cd C:\Projects\carcon-ai-main
code .
```

VS Code opens with the project tree on the left.

### 2.4 Install recommended VS Code extensions

Press **Ctrl+Shift+X** and install these (search by name):

- **Python** (Microsoft)
- **Pylance** (Microsoft)
- **ESLint** (Microsoft)
- **Tailwind CSS IntelliSense** (Tailwind Labs)
- **ES7+ React/Redux/React-Native snippets**
- **SQLite Viewer** (Florian Klampfer) — to browse `facets.db` later
- **Thunder Client** *or* **REST Client** — to hit the API without a browser

---

## 3. Backend setup (FastAPI + Python)

Open the VS Code integrated terminal: **Ctrl+`** (the key just above Tab).
Make sure the terminal shows **PowerShell** (you can switch via the dropdown).

### 3.1 Create and activate a virtual environment

```powershell
cd C:\Projects\carcon-ai-main\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks the activate script with a security message, run this
**once** (as Administrator) and re-activate:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Your prompt should now start with `(venv)`.

### 3.2 Install Python dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If `pip install` complains about Microsoft Visual C++ build tools (only happens
on some packages), install **Microsoft C++ Build Tools** from
<https://aka.ms/vs/17/release/vs_BuildTools.exe> → tick *"Desktop development
with C++"*, then rerun the command.

### 3.3 Create the backend `.env` file

In VS Code, create a new file `backend\.env` (right-click the `backend` folder
→ *New File*) and paste **exactly**:

```env
DATABASE_URL=sqlite:///./facets.db
JWT_SECRET=change-me-to-a-long-random-string-please
ADMIN_EMAIL=admin@facetscrm.com
ADMIN_PASSWORD=password123
CORS_ORIGINS=*
MONGO_URL=mongodb://localhost:27017
DB_NAME=facets
```

> Notes:
> - `DATABASE_URL` is the **only line you change** when you switch to SQL
>   Server (see Section 6).
> - `MONGO_URL` / `DB_NAME` exist only because some legacy code reads them on
>   import. They are **not** used at runtime when `DATABASE_URL` is set.
> - The campaign engine + AI features are optional. Add any of these later
>   without restarting your install:
>     ```env
>     VAPI_API_KEY=...
>     VAPI_PHONE_NUMBER_ID=...
>     VAPI_ASSISTANT_ID=...
>     DEEPSEEK_API_KEY=...
>     WHATSAPP_TOKEN=...
>     WHATSAPP_PHONE_NUMBER_ID=...
>     ```

### 3.4 Start the backend

Still inside `(venv)` in the `backend` folder:

```powershell
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Application startup complete.
INFO:     Facets CRM ready
```

Open <http://localhost:8001/api/health> in your browser — you should get
`{"status":"ok","db":"ok"}`. Swagger docs are at <http://localhost:8001/docs>.

> **Leave this terminal running.** Open a *second* terminal (Ctrl+Shift+`) for
> the frontend.

### 3.5 First-run database & admin seed

The first time you run the backend it will:

1. Create all tables in `backend\facets.db` (SQLite) **OR** in your SQL Server
   database if you've configured one (Section 6).
2. Seed an admin user using `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env`.

Confirm the admin works:

```powershell
curl http://localhost:8001/api/auth/login -Method POST `
     -ContentType "application/json" `
     -Body '{"email":"admin@facetscrm.com","password":"password123"}'
```

You should see a JSON response with `access_token` and `refresh_token`.

---

## 4. Frontend setup (React 19 + Tailwind)

Open a **second** terminal in VS Code (`Ctrl+Shift+\``). It does **not** need
the Python venv.

### 4.1 Install Node dependencies

```powershell
cd C:\Projects\carcon-ai-main\frontend
yarn install
```

> The first install takes 2–4 minutes. Subsequent installs are instant.

### 4.2 Create the frontend `.env` file

Create `frontend\.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=0
ENABLE_HEALTH_CHECK=false
```

> `WDS_SOCKET_PORT=0` lets the dev server pick a free websocket port and
> avoids the *"WebSocket connection failed"* warning some Windows networks
> show.

### 4.3 Start the frontend

```powershell
yarn start
```

After about 30 seconds your default browser opens automatically at
<http://localhost:3000>. Log in with:

- **Email** `admin@facetscrm.com`
- **Password** `password123`

You should land on the Dashboard with seeded leads, tasks, and the new
**AI Calling** section in the left navigation.

---

## 5. Recap — what to run every morning

1. Open VS Code → open `C:\Projects\carcon-ai-main`.
2. Terminal #1 (backend):
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```
3. Terminal #2 (frontend):
   ```powershell
   cd frontend
   yarn start
   ```
4. Browser → <http://localhost:3000> → log in.

To stop a process press **Ctrl+C** in that terminal.

---

## 6. (Optional) Use Microsoft SQL Server instead of SQLite

Use this section only if your office requires SQL Server. SQLite (the default)
is fine for everyday work.

### 6.1 Install SQL Server Express (free)

1. Download **SQL Server 2022 Express** →
   <https://www.microsoft.com/en-us/sql-server/sql-server-downloads>
   → choose *"Express"*.
2. Run the installer → *Basic* install. Note the instance name shown at the
   end (usually `SQLEXPRESS`) — you'll need it.
3. Download **SQL Server Management Studio (SSMS)** →
   <https://aka.ms/ssmsfullsetup>. This is the GUI to manage the DB.

### 6.2 Enable SQL authentication (so we can use a username/password)

1. Open **SSMS** → connect to `localhost\SQLEXPRESS` using *Windows
   Authentication*.
2. Right-click the server name → **Properties** → **Security** → select
   **SQL Server and Windows Authentication mode** → OK.
3. Expand **Security → Logins** → right-click the `sa` user → **Properties**.
   - Set a strong password (e.g. `Facets@2026!`).
   - Untick *Enforce password expiration*.
4. Right-click the server name → **Restart**.

### 6.3 Create the database and a dedicated user

In SSMS, click **New Query** and run:

```sql
CREATE DATABASE FacetsCRM;
GO

CREATE LOGIN facets_app WITH PASSWORD = 'Facets@2026!';
GO

USE FacetsCRM;
CREATE USER facets_app FOR LOGIN facets_app;
EXEC sp_addrolemember 'db_owner', 'facets_app';
GO
```

### 6.4 Install the Python ODBC driver

1. Download and install **Microsoft ODBC Driver 18 for SQL Server**
   (64-bit) → <https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server>
2. In the **backend venv terminal**, add the Python driver:
   ```powershell
   pip install pyodbc
   ```

### 6.5 Switch the backend to SQL Server

Edit `backend\.env` and replace the `DATABASE_URL` line with:

```env
DATABASE_URL=mssql+pyodbc://facets_app:Facets%402026!@localhost\SQLEXPRESS/FacetsCRM?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=no&TrustServerCertificate=yes
```

> Notes:
> - The `@` in `Facets@2026!` must be URL-encoded as `%40` (already done above).
> - `Encrypt=no&TrustServerCertificate=yes` is needed for the default local
>   self-signed certificate. Remove both in production.

### 6.6 Restart the backend

Stop uvicorn (Ctrl+C) and start it again:

```powershell
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

On first run the backend will create all tables in **FacetsCRM** and seed the
admin user. Verify in SSMS:

```sql
USE FacetsCRM;
SELECT name FROM sys.tables ORDER BY name;
SELECT id, email, role FROM users;
```

You should see all the tables (`leads`, `campaigns`, `campaign_targets`, …)
and one row in `users`.

---

## 7. (Optional) Browse the SQLite database in VS Code

If you stay on SQLite, install the **SQLite Viewer** extension (already
suggested in §2.4), then click `backend\facets.db` in the file explorer.
Tables open in a clean grid view.

---

## 8. (Optional) One-click "Run all" in VS Code

Create the folder and file `.vscode\launch.json` at the project root with this
content:

```json
{
  "version": "0.2.0",
  "compounds": [
    {
      "name": "Run Facets CRM (backend + frontend)",
      "configurations": ["Backend (FastAPI)", "Frontend (React)"]
    }
  ],
  "configurations": [
    {
      "name": "Backend (FastAPI)",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["server:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
      "cwd": "${workspaceFolder}/backend",
      "python": "${workspaceFolder}/backend/venv/Scripts/python.exe",
      "console": "integratedTerminal",
      "justMyCode": false
    },
    {
      "name": "Frontend (React)",
      "type": "node-terminal",
      "request": "launch",
      "command": "yarn start",
      "cwd": "${workspaceFolder}/frontend"
    }
  ]
}
```

Now press **F5** → choose *"Run Facets CRM (backend + frontend)"* → both
processes start in their own terminals with breakpoints enabled on the
backend.

---

## 9. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `python` opens the Microsoft Store | Settings → Apps → Advanced app settings → App execution aliases → **disable** both `python.exe` and `python3.exe`. Then sign out / in. |
| `.\venv\Scripts\Activate.ps1 : running scripts is disabled` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once in an Admin PowerShell. |
| `yarn` not found after install | Close all terminals and open a new one — PATH only refreshes for new shells. Or run `corepack enable` then `corepack prepare yarn@stable --activate`. |
| Backend log says `ModuleNotFoundError: sqlalchemy` | You forgot to activate the venv. Re-run `.\venv\Scripts\Activate.ps1` then `pip install -r requirements.txt`. |
| Login returns `invalid credentials` | The admin is seeded **once** on first start. Either delete `backend\facets.db` and restart, or update `users` directly: `UPDATE users SET hashed_password='...' WHERE email='admin@facetscrm.com';` (better: just delete the DB file). |
| Frontend shows `Network Error` on every API call | `frontend\.env` is missing or wrong. Make sure it contains `REACT_APP_BACKEND_URL=http://localhost:8001` and **restart `yarn start`** — env changes need a restart. |
| Port 8001 or 3000 already in use | `Get-Process -Id (Get-NetTCPConnection -LocalPort 8001).OwningProcess` then `Stop-Process -Id <pid>`. Same for 3000. |
| SQL Server: `pyodbc.OperationalError: Login failed for user` | The `sa`/`facets_app` password in `.env` doesn't match what you set in SSMS. Remember the `@` must be `%40` in the URL. |
| SQL Server: `Cannot open server "..."` | Open **SQL Server Configuration Manager** → *SQL Server Network Configuration* → *Protocols for SQLEXPRESS* → enable **TCP/IP**, then restart the SQL Server service. |
| Tailwind classes don't apply | Confirm the *Tailwind CSS IntelliSense* extension is installed and there is no red squiggle in `frontend\tailwind.config.js`. Restart `yarn start`. |

---

## 10. Daily commands cheat sheet

```powershell
# Update backend deps after pulling new code
cd C:\Projects\carcon-ai-main\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Update frontend deps
cd C:\Projects\carcon-ai-main\frontend
yarn install

# Start everything
# (terminal 1)
cd C:\Projects\carcon-ai-main\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
# (terminal 2)
cd C:\Projects\carcon-ai-main\frontend
yarn start

# Run backend tests
cd C:\Projects\carcon-ai-main\backend
.\venv\Scripts\Activate.ps1
python -m pytest -q

# Reset the SQLite database (drops all data — DEV ONLY)
del C:\Projects\carcon-ai-main\backend\facets.db
# then restart uvicorn — schema + admin will be re-created
```

---

## 11. Where to find things

```
carcon-ai-main\
├── backend\
│   ├── server.py              # FastAPI entry point
│   ├── models.py              # SQLAlchemy tables
│   ├── schemas.py             # Pydantic request/response models
│   ├── routers\               # API endpoints (one file per module)
│   ├── services\
│   │   ├── campaign_engine.py # Background AI-calling engine
│   │   ├── campaign_dialer.py # Mock + Vapi auto-switch
│   │   ├── deepseek.py        # AI summaries / scripts (optional)
│   │   └── vapi_voice.py      # Real outbound voice (optional)
│   ├── .env                   # ← your local config
│   ├── facets.db              # ← SQLite file (auto-created)
│   └── requirements.txt
├── frontend\
│   ├── src\
│   │   ├── pages\             # Dashboard, Leads, Campaigns, …
│   │   ├── components\        # Layout + shadcn/ui primitives
│   │   └── lib\               # api.js, auth.jsx, format.js
│   ├── .env                   # ← your local config
│   ├── package.json
│   └── tailwind.config.js
├── memory\
│   ├── PRD.md                 # Living product spec
│   └── test_credentials.md    # Demo logins
└── README.md                  # This file
```

You're now ready to develop, demo, and ship the Facets Jewellery CRM from a
Windows 11 office machine. Happy building!
# carbon-ai
