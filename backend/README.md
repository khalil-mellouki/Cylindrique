# Cylindrique API

FastAPI backend for the Cylindrique workspace app (Teams → Projects → Notes).

## Run locally

```bash
cd backend
py -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

With no `DATABASE_URL` set, it uses a local SQLite file (`cylindrique.db`), so
no external database is required for development.

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Environment

See [.env.example](.env.example). For production set:

- `DATABASE_URL` — the Supabase **pooled** connection string (port 6543).
- `ALLOWED_ORIGINS` — comma-separated frontend origin(s) for CORS.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team `{name}` |
| GET | `/api/teams/{team_id}/projects` | List projects in a team |
| POST | `/api/teams/{team_id}/projects` | Create project `{name}` |
| GET | `/api/projects/{project_id}/notes` | List notes in a project |
| POST | `/api/projects/{project_id}/notes` | Create note `{title, content}` |
| PUT | `/api/notes/{note_id}` | Update note (partial) |
| DELETE | `/api/notes/{note_id}` | Delete note |
