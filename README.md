# Cylindrique

A small workspace app for organizing work into Teams, Projects, and Notes.

## Live

- Frontend (Vercel): https://cylindrique-three.vercel.app
- Backend API (Render): https://cylindrique-api.onrender.com
- API docs (Swagger): https://cylindrique-api.onrender.com/docs

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, on Vercel
- Backend: FastAPI + SQLModel, on Render
- Database: Supabase (Postgres)

## Architecture

    Browser -> Next.js (Vercel) -> FastAPI (Render) -> Supabase (Postgres)

The frontend never talks to the database directly. It calls the FastAPI
backend through a typed fetch wrapper (cylindrique/src/lib/api.ts), and the
backend owns all database access.

Why these choices:

- Postgres (Supabase) over SQLite: hosted/serverless filesystems don't
  persist, so a managed database is needed for data to survive restarts.
- Backend-first: the API was built and tested before the UI, so the frontend
  had a real, working contract to build against.
- shadcn/ui: consistent, accessible components instead of hand-rolled UI.

## Data model

    teams
      id (uuid, pk), name, created_at

    projects
      id (uuid, pk), team_id -> teams.id, name, created_at

    notes
      id (uuid, pk), project_id -> projects.id, title, content,
      created_at, updated_at

Foreign keys use ON DELETE CASCADE: deleting a team removes its projects, and
deleting a project removes its notes. This keeps the data consistent without
extra cleanup code.

## API endpoints

    GET     /api/health
    GET     /api/teams
    POST    /api/teams
    GET     /api/teams/{team_id}/projects
    POST    /api/teams/{team_id}/projects
    GET     /api/projects/{project_id}/notes
    POST    /api/projects/{project_id}/notes
    PUT     /api/notes/{note_id}
    DELETE  /api/notes/{note_id}

## Run locally

Backend:

    cd backend
    python -m venv .venv
    .venv\Scripts\activate          # Windows (use "py -m venv .venv" if needed)
    # source .venv/bin/activate     # macOS/Linux
    pip install -r requirements.txt
    uvicorn main:app --reload

With no DATABASE_URL set, the backend uses a local SQLite file, so no database
setup is needed for development. To use Postgres, set DATABASE_URL (see
backend/.env.example).

Frontend:

    cd cylindrique
    npm install
    # create .env.local containing:
    #   NEXT_PUBLIC_API_URL=http://localhost:8000
    npm run dev

Then open http://localhost:3000

## Trade-offs (deliberate)

- No authentication — out of scope for this build.
- No pagination — fine at this data size.
- No automated tests — the API was verified with an end-to-end smoke script.
- Fetch-then-refresh instead of optimistic UI — simpler and more predictable.
- The design showed team members, project status/progress, and note authors.
  These aren't in the data model, so they were left out to keep everything
  backed by real, persisted data.

## With more time

- Authentication (Supabase Auth) and per-user data.
- React Query for caching and optimistic updates.
- Tests on the API routes.
- Search across the whole workspace, and pagination.
