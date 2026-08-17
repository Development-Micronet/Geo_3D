# GEO-3D: SLPK 3D GIS Viewer

An ArcGIS-Earth-like 3D GIS web application for viewing `.slpk` (Scene Layer Package / I3S) packages and spatial datasets, built on open, scalable technologies: **React + CesiumJS** on the frontend and **Django + PostgreSQL** on the backend.

---

## 🌟 Key Features & Architecture

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, CesiumJS | Interactive 3D globe viewer, responsive UI across all devices (mobile, tablet, desktop), layer management, measurement & spatial analysis tools. |
| **Backend** | Django 5.x (`geo3d_backend`) | Production-ready REST API running on port `8000`. Handles authentication, user management, package uploads, and streaming 3D I3S tiles. |
| **Database** | PostgreSQL | Secure storage for user accounts, roles (`superadmin`, `admin`, `user`), and custom JSON permissions. |
| **3D SLPK Extraction** | Native Gzip Inflator & Worker | Unzips `.slpk` archives, handles gzip byte stream decompression (`0x1f 0x8b`), and parses `3dSceneLayer.json` metadata asynchronously. |
| **Static I3S Serving** | Custom Layer File Server | Serves extracted I3S scene layer tiles, Draco geometry buffers, and DDS/KTX2 textures with full CORS headers (`Access-Control-Allow-Origin: *`). |
| **Admin Panel** | Django Admin (`/admin`) | Visual user management interface for superadmins at `http://localhost:8000/admin/`. |

---

## 📁 Repository Structure

```
geo3d/
├── frontend/                      <-- React + CesiumJS Frontend
│   ├── src/
│   │   ├── App.jsx                <-- App container, 3D viewer & top navigation bar
│   │   ├── components/            <-- LayerManager, LoginModal, AdminModal, AnalysisPanels
│   │   └── services/
│   │       ├── api.js             <-- Dynamic API client & layer URL resolver
│   │       └── auth.js            <-- Authentication & token session manager
│   ├── vite.config.js             <-- Vite dev server configuration (Port 5173)
│   ├── index.html                 <-- Global responsive CSS & app entry
│   ├── package.json
│   └── Dockerfile                 <-- Production Nginx Docker container
│
├── geo3d_backend/                 <-- Django + PostgreSQL Backend
│   ├── manage.py                  <-- Django CLI utility
│   ├── .env                       <-- PostgreSQL database credentials
│   ├── requirements.txt           <-- Django, psycopg2-binary, django-cors-headers
│   ├── geo3d_backend/
│   │   ├── settings.py            <-- CORS settings, PostgreSQL config, storage paths
│   │   └── urls.py                <-- Main URL dispatcher
│   └── api/
│       ├── models.py              <-- Custom User model extending AbstractUser
│       ├── views.py               <-- REST API endpoints & static layer resource server
│       ├── urls.py                <-- /api/* routing patterns
│       └── services/
│           ├── storage.py         <-- Package metadata index registry
│           └── slpk_extractor.py  <-- Archive extraction engine
│
├── docker-compose.yml             <-- Docker Compose orchestrator (Port 8000 & 5173)
└── README.md
```

---

## 🛠️ Requirements & Installation

### Backend Setup (`geo3d_backend`)

1. **Prerequisites:** Python 3.10+ and PostgreSQL.
2. **Database:** Create a PostgreSQL database (e.g. `CREATE DATABASE geo;`).
3. **Install Dependencies:**
   ```bash
   cd geo3d_backend
   pip install -r requirements.txt
   ```
4. **Configure Settings:** Update PostgreSQL credentials in `config/settings.py` or `geo3d_backend/.env`.
5. **Run Migrations:**
   ```bash
   python manage.py makemigrations api
   python manage.py migrate
   ```
6. **Create Superadmin:**
   ```bash
   python manage.py createsuperuser
   ```
7. **Start Backend Server (Port 8000):**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

Check backend health: `curl http://localhost:8000/api/health` -> `{"status": "ok"}`

---

### Frontend Setup (`frontend`)

1. **Prerequisites:** Node.js 18+ and npm.
2. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```
3. **Start Development Server (Port 5173):**
   ```bash
   npm run dev
   ```
4. Open **`http://localhost:5173`** in your browser to log in and view 3D datasets!

---

### 🐳 Run with Docker Compose

Launch the full stack with a single command:

```bash
docker-compose up --build -d
```

- **Frontend:** `http://localhost:5173` (or `http://localhost:3000`)
- **Backend API:** `http://localhost:8000`
- **Django Admin:** `http://localhost:8000/admin/`

---

## 🔒 Security & CORS

- **CORS Support:** `django-cors-headers` middleware is configured at the top of the Django middleware stack (`CORS_ALLOW_ALL_ORIGINS = True`, `CORS_ALLOW_CREDENTIALS = True`), enabling seamless multi-device, local network, and cross-origin deployment.
- **Authentication:** Password hashing powered by Django's native PBKDF2 algorithm. User permissions are stored cleanly as JSON fields per account.
