# Cylindrique

A collaborative workspace app: sign in with Google, create Teams, invite people,
and organize work into Projects, Notes, and Comments — with role-based access
control enforced at the database level.

## Live

- Frontend (Vercel): https://cylindrique-three.vercel.app
- Auth + data + storage: Supabase (project `mqspwlizbdnujbpuclpe`)

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, on Vercel
- Backend: **none** — the frontend talks directly to Supabase
- Auth: Supabase Auth (Google OAuth)
- Database + Storage: Supabase (Postgres with Row Level Security; Storage for avatars)

> An earlier version used a FastAPI backend (still in `backend/`, now unused). It
> was retired when auth was added: with a privileged backend connection, Postgres
> RLS can't enforce per-user access. Talking to Supabase directly makes **RLS the
> real security boundary**.

## Architecture

    Browser ──(auth cookie / user JWT)──► Supabase (Postgres + RLS, Auth, Storage)
        └── Next.js (Vercel): UI, @supabase/ssr session, middleware route guard

The frontend uses `@supabase/ssr`. Middleware refreshes the session and redirects
unauthenticated users to `/login`. Every query runs as the signed-in user, and
**RLS decides what rows they can see or change** — even a UI bug can't leak data.

## Security model (RLS + RBAC)

- RLS is enabled on every table; nothing is reachable by anonymous users.
- Membership checks used inside policies go through `SECURITY DEFINER` helpers in
  a private schema, so they can't be called directly and can't cause policy
  recursion.
- Mutations with cross-row invariants (accept invite, join by link, role changes,
  leave/remove/transfer) go through `SECURITY DEFINER` RPCs — `team_members` has
  no direct client write path, preventing privilege escalation.
- Roles per team: **owner / admin / member**. Owner manages everything; admin
  invites and manages content; member creates/edits projects, notes, comments.

The full schema, policies, and functions are one migration:
[`supabase/migrations/0001_auth_rbac.sql`](supabase/migrations/0001_auth_rbac.sql).

## Data model

    profiles(id → auth.users, username, full_name, bio, contact_email, links, avatar_url)
    teams(id, name, owner_id)
    team_members(team_id, user_id, role)             -- owner/admin/member
    team_invites(id, team_id, invitee_id, role, status)
    team_invite_links(id, team_id, token, role, expires_at, max_uses, uses)
    projects(id, team_id, name, created_by)
    notes(id, project_id, title, content, created_by)
    comments(id, note_id, author_id, body)

Foreign keys cascade down; deleting a user cascades to their profile and owned
teams. Projects/notes inherit access from team membership.

## Features

- Google sign-in; auto-created profile; editable profile with avatar upload and a
  public `/u/<username>` page.
- Teams with members; invite by username search or a shareable `/join/<token>`
  link; accept/decline received invitations.
- Projects and notes; per-note comments.
- Role-gated management (change roles, remove members, transfer ownership, leave).

## Run locally

Requires Docker (for the local Supabase stack) and Node.

    # 1) Start Supabase locally (applies the migration)
    supabase start

    # 2) Frontend
    cd cylindrique
    npm install
    # .env.local  (use the values `supabase start` prints for local, or the
    #              hosted project's values):
    #   NEXT_PUBLIC_SUPABASE_URL=...
    #   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    npm run dev        # http://localhost:3000

Google OAuth must be configured in the Supabase dashboard (Auth → Providers →
Google) with the callback `https://<project>.supabase.co/auth/v1/callback`.

## Tests

    cd cylindrique
    # RLS isolation + RBAC (needs a running local stack; keys from `supabase start`)
    SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
      node tests/rls.test.mjs
    # Authenticated E2E (app running on APP_URL, local stack keys)
    SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
      APP_URL=http://localhost:3000 node tests/e2e.mjs

`tests/rls.test.mjs` proves cross-user isolation, RPC-only membership, and the
RBAC invariants. The RLS policies were also hardened via an adversarial audit.

## Trade-offs

- No public team directory — teams are private; you join by invite or link.
- Notes are aggregated per team with a couple of queries (no server-side join
  endpoint) — fine at this scale.
- `contact_email` is not auto-filled from the login email (privacy); users opt in.
- No pagination yet.
