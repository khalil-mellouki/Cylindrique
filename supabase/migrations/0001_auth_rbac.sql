-- Cylindrique — auth-aware schema with RLS-based RBAC (Supabase-native).
--
-- Run in the Supabase SQL editor (or `supabase db push`). This is DESTRUCTIVE:
-- it drops the old auth-less teams/projects/notes tables and their data, then
-- rebuilds everything with ownership, memberships, invites, comments, and RLS.
--
-- Security model:
--   * RLS is enabled on every table and is the ONLY security boundary.
--   * Membership checks used inside policies go through SECURITY DEFINER helpers
--     (owned by postgres, which bypasses RLS) so policies never self-reference
--     their own table — this avoids infinite recursion on team_members.
--   * Mutations with cross-row invariants (accepting invites, joining by link,
--     role changes, leaving/removing/transferring) go through SECURITY DEFINER
--     RPCs, NOT client policies — this prevents privilege escalation and
--     protects the last-owner invariant. team_members has no client write policy.

begin;

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- 2. Destructive reset of the old (auth-less) schema
-- ---------------------------------------------------------------------------
drop table if exists public.comments          cascade;
drop table if exists public.notes             cascade;
drop table if exists public.projects          cascade;
drop table if exists public.team_invite_links cascade;
drop table if exists public.team_invites      cascade;
drop table if exists public.team_members      cascade;
drop table if exists public.teams             cascade;
drop table if exists public.profiles          cascade;

drop type if exists public.team_role     cascade;
drop type if exists public.invite_status cascade;

-- ---------------------------------------------------------------------------
-- 3. Enums
-- ---------------------------------------------------------------------------
create type public.team_role     as enum ('owner', 'admin', 'member');
create type public.invite_status as enum ('pending', 'accepted', 'declined');

-- ---------------------------------------------------------------------------
-- 4. Tables
-- ---------------------------------------------------------------------------

-- profiles: one per auth user, auto-created by trigger on signup.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null,
  full_name     text,
  bio           text,
  contact_email text,
  linkedin_url  text,
  github_url    text,
  website_url   text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 2 and 32),
  constraint profiles_username_chars check (username ~ '^[a-z0-9_]+$')
);
create unique index profiles_username_key on public.profiles (lower(username));
create index profiles_username_trgm on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_fullname_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);

-- teams
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index teams_owner_idx on public.teams (owner_id);

-- team_members (recursion-critical: no client write policy)
create table public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.team_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id);

-- team_invites: direct invite of a specific user by an admin/owner
create table public.team_invites (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  role       public.team_role not null default 'member' check (role in ('admin', 'member')),
  status     public.invite_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index team_invites_unique_pending
  on public.team_invites (team_id, invitee_id) where status = 'pending';
create index team_invites_invitee_idx on public.team_invites (invitee_id);
create index team_invites_team_idx    on public.team_invites (team_id);

-- team_invite_links: shareable token join
create table public.team_invite_links (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  token      text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  role       public.team_role not null default 'member' check (role in ('admin', 'member')),
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  max_uses   integer check (max_uses is null or max_uses > 0),
  uses       integer not null default 0,
  created_at timestamptz not null default now()
);
create index team_invite_links_team_idx on public.team_invite_links (team_id);

-- projects
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index projects_team_idx    on public.projects (team_id);
create index projects_creator_idx on public.projects (created_by);

-- notes
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 200),
  content    text not null default '',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_project_idx on public.notes (project_id);
create index notes_creator_idx on public.notes (created_by);

-- comments (simple flat)
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes (id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index comments_note_idx on public.comments (note_id, created_at);

-- ---------------------------------------------------------------------------
-- 5. Grants (RLS still restricts every row; anon has no access)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- 6. SECURITY DEFINER helpers (define BEFORE policies; anti-recursion core)
-- ---------------------------------------------------------------------------
create or replace function public.is_team_member(_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = auth.uid()
  );
$$;

create or replace function public.team_role(_team_id uuid)
returns public.team_role language sql stable security definer set search_path = '' as $$
  select role from public.team_members
  where team_id = _team_id and user_id = auth.uid();
$$;

create or replace function public.team_role_of(_team_id uuid, _user_id uuid)
returns public.team_role language sql stable security definer set search_path = '' as $$
  select role from public.team_members
  where team_id = _team_id and user_id = _user_id;
$$;

create or replace function public.can_manage_team(_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.team_role(_team_id) in ('owner', 'admin');
$$;

create or replace function public.is_team_owner(_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.team_role(_team_id) = 'owner';
$$;

create or replace function public.team_of_project(_project_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select team_id from public.projects where id = _project_id;
$$;

create or replace function public.team_of_note(_note_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select p.team_id
  from public.notes n
  join public.projects p on p.id = n.project_id
  where n.id = _note_id;
$$;

create or replace function public.can_access_project(_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_team_member(public.team_of_project(_project_id));
$$;

create or replace function public.can_access_note(_note_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_team_member(public.team_of_note(_note_id));
$$;

revoke all on function
  public.is_team_member(uuid), public.team_role(uuid), public.team_role_of(uuid, uuid),
  public.can_manage_team(uuid), public.is_team_owner(uuid),
  public.team_of_project(uuid), public.team_of_note(uuid),
  public.can_access_project(uuid), public.can_access_note(uuid)
from public;
grant execute on function
  public.is_team_member(uuid), public.team_role(uuid), public.team_role_of(uuid, uuid),
  public.can_manage_team(uuid), public.is_team_owner(uuid),
  public.team_of_project(uuid), public.team_of_note(uuid),
  public.can_access_project(uuid), public.can_access_note(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Enable RLS + policies
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.teams             enable row level security;
alter table public.team_members      enable row level security;
alter table public.team_invites      enable row level security;
alter table public.team_invite_links enable row level security;
alter table public.projects          enable row level security;
alter table public.notes             enable row level security;
alter table public.comments          enable row level security;

-- profiles: readable by any signed-in user (search + public profile); self-write only.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- teams
create policy teams_select on public.teams
  for select to authenticated using (public.is_team_member(id));
create policy teams_insert on public.teams
  for insert to authenticated with check (owner_id = auth.uid());
create policy teams_update on public.teams
  for update to authenticated using (public.can_manage_team(id)) with check (public.can_manage_team(id));
create policy teams_delete on public.teams
  for delete to authenticated using (public.is_team_owner(id));

-- team_members: read co-members of your teams; ALL writes via RPC only.
create policy team_members_select on public.team_members
  for select to authenticated using (public.is_team_member(team_id));

-- team_invites
create policy team_invites_select on public.team_invites
  for select to authenticated
  using (invitee_id = auth.uid() or public.can_manage_team(team_id));
create policy team_invites_insert on public.team_invites
  for insert to authenticated
  with check (public.can_manage_team(team_id) and invited_by = auth.uid() and status = 'pending');
create policy team_invites_delete on public.team_invites
  for delete to authenticated
  using (public.can_manage_team(team_id) or invitee_id = auth.uid());
-- No UPDATE policy: accept/decline go through RPCs.

-- team_invite_links: admins manage; joiners never SELECT (they use RPCs by token).
create policy team_invite_links_select on public.team_invite_links
  for select to authenticated using (public.can_manage_team(team_id));
create policy team_invite_links_insert on public.team_invite_links
  for insert to authenticated
  with check (public.can_manage_team(team_id) and created_by = auth.uid());
create policy team_invite_links_update on public.team_invite_links
  for update to authenticated
  using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
create policy team_invite_links_delete on public.team_invite_links
  for delete to authenticated using (public.can_manage_team(team_id));

-- projects: any team member reads/creates/edits; creator or admin deletes.
create policy projects_select on public.projects
  for select to authenticated using (public.is_team_member(team_id));
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_team_member(team_id) and created_by = auth.uid());
create policy projects_update on public.projects
  for update to authenticated
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy projects_delete on public.projects
  for delete to authenticated
  using (created_by = auth.uid() or public.can_manage_team(team_id));

-- notes
create policy notes_select on public.notes
  for select to authenticated using (public.can_access_project(project_id));
create policy notes_insert on public.notes
  for insert to authenticated
  with check (public.can_access_project(project_id) and created_by = auth.uid());
create policy notes_update on public.notes
  for update to authenticated
  using (public.can_access_project(project_id)) with check (public.can_access_project(project_id));
create policy notes_delete on public.notes
  for delete to authenticated
  using (created_by = auth.uid() or public.can_manage_team(public.team_of_project(project_id)));

-- comments
create policy comments_select on public.comments
  for select to authenticated using (public.can_access_note(note_id));
create policy comments_insert on public.comments
  for insert to authenticated
  with check (public.can_access_note(note_id) and author_id = auth.uid());
create policy comments_update on public.comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.can_manage_team(public.team_of_note(note_id)));

-- ---------------------------------------------------------------------------
-- 8. Triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profile on signup, with a unique generated username.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base      text;
  candidate text;
  n         integer := 0;
begin
  base := regexp_replace(
    lower(coalesce(new.raw_user_meta_data ->> 'name',
                   split_part(new.email, '@', 1),
                   'user')),
    '[^a-z0-9_]', '', 'g');
  if char_length(base) < 2 then
    base := 'user';
  end if;
  base := left(base, 28);
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username, full_name, contact_email, avatar_url)
  values (
    new.id,
    candidate,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Team creator becomes owner.
create or replace function public.handle_new_team()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

-- Block silent owner hijack via UPDATE (transfer must go through the RPC).
create or replace function public.guard_team_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id and auth.uid() <> old.owner_id then
    raise exception 'only the current owner can transfer ownership';
  end if;
  return new;
end;
$$;

drop trigger if exists team_owner_guard on public.teams;
create trigger team_owner_guard
  before update on public.teams
  for each row execute function public.guard_team_owner();

-- notes.updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch
  before update on public.notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 9. RPCs (SECURITY DEFINER; cross-row invariants that policies can't express)
-- ---------------------------------------------------------------------------

create or replace function public.accept_invite(_invite_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.team_invites;
begin
  select * into inv from public.team_invites
    where id = _invite_id and invitee_id = auth.uid() and status = 'pending'
    for update;
  if not found then
    raise exception 'invite not found or not pending';
  end if;
  insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do nothing;
  update public.team_invites set status = 'accepted' where id = _invite_id;
  return inv.team_id;
end;
$$;

create or replace function public.decline_invite(_invite_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.team_invites set status = 'declined'
  where id = _invite_id and invitee_id = auth.uid() and status = 'pending';
$$;

-- Safe read for the "join by link" confirm screen (no table SELECT exposed).
create or replace function public.preview_invite_link(_token text)
returns table (team_id uuid, team_name text, role public.team_role,
               valid boolean, already_member boolean)
language plpgsql security definer set search_path = '' as $$
declare l public.team_invite_links;
begin
  select * into l from public.team_invite_links where token = _token;
  if not found then
    return query select null::uuid, null::text, null::public.team_role, false, false;
    return;
  end if;
  return query
    select l.team_id,
           t.name,
           l.role,
           (l.expires_at is null or l.expires_at > now())
             and (l.max_uses is null or l.uses < l.max_uses),
           public.is_team_member(l.team_id)
    from public.teams t
    where t.id = l.team_id;
end;
$$;

create or replace function public.join_team_via_link(_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare l public.team_invite_links;
begin
  select * into l from public.team_invite_links where token = _token for update;
  if not found then
    raise exception 'invalid link';
  end if;
  if l.expires_at is not null and l.expires_at <= now() then
    raise exception 'link expired';
  end if;
  if l.max_uses is not null and l.uses >= l.max_uses then
    raise exception 'link exhausted';
  end if;
  if public.is_team_member(l.team_id) then
    return l.team_id;  -- idempotent
  end if;
  insert into public.team_members (team_id, user_id, role)
    values (l.team_id, auth.uid(), l.role);
  update public.team_invite_links set uses = uses + 1 where id = l.id;
  return l.team_id;
end;
$$;

create or replace function public.set_member_role(_team_id uuid, _user_id uuid, _role public.team_role)
returns void language plpgsql security definer set search_path = '' as $$
declare caller public.team_role;
begin
  caller := public.team_role(_team_id);
  if caller is null then
    raise exception 'not a member of this team';
  end if;
  -- Anything touching ownership requires the current owner.
  if _role = 'owner' or public.team_role_of(_team_id, _user_id) = 'owner' then
    raise exception 'use transfer_ownership to change ownership';
  end if;
  if caller not in ('owner', 'admin') then
    raise exception 'insufficient privileges';
  end if;
  update public.team_members set role = _role
    where team_id = _team_id and user_id = _user_id;
  if not found then
    raise exception 'target is not a member';
  end if;
end;
$$;

create or replace function public.leave_team(_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(_team_id) = 'owner'
     and (select count(*) from public.team_members where team_id = _team_id and role = 'owner') = 1 then
    raise exception 'transfer ownership or delete the team before leaving';
  end if;
  delete from public.team_members where team_id = _team_id and user_id = auth.uid();
end;
$$;

create or replace function public.remove_member(_team_id uuid, _user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller public.team_role;
declare target public.team_role;
begin
  caller := public.team_role(_team_id);
  target := public.team_role_of(_team_id, _user_id);
  if caller not in ('owner', 'admin') then
    raise exception 'insufficient privileges';
  end if;
  if target is null then
    raise exception 'target is not a member';
  end if;
  if target = 'owner' then
    raise exception 'cannot remove the owner';
  end if;
  if caller = 'admin' and target = 'admin' then
    raise exception 'admins cannot remove other admins';
  end if;
  delete from public.team_members where team_id = _team_id and user_id = _user_id;
end;
$$;

create or replace function public.transfer_ownership(_team_id uuid, _new_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(_team_id) <> 'owner' then
    raise exception 'only the owner can transfer ownership';
  end if;
  if public.team_role_of(_team_id, _new_owner) is null then
    raise exception 'new owner must already be a team member';
  end if;
  update public.team_members set role = 'admin'
    where team_id = _team_id and user_id = auth.uid();
  update public.team_members set role = 'owner'
    where team_id = _team_id and user_id = _new_owner;
  update public.teams set owner_id = _new_owner where id = _team_id;
end;
$$;

revoke all on function
  public.accept_invite(uuid), public.decline_invite(uuid),
  public.preview_invite_link(text), public.join_team_via_link(text),
  public.set_member_role(uuid, uuid, public.team_role),
  public.leave_team(uuid), public.remove_member(uuid, uuid),
  public.transfer_ownership(uuid, uuid)
from public;
grant execute on function
  public.accept_invite(uuid), public.decline_invite(uuid),
  public.preview_invite_link(text), public.join_team_via_link(text),
  public.set_member_role(uuid, uuid, public.team_role),
  public.leave_team(uuid), public.remove_member(uuid, uuid),
  public.transfer_ownership(uuid, uuid)
to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- 10. Storage bucket for avatars (run separately if the buckets insert is
--     restricted in your project; or create the bucket in the Storage UI).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars owner write" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
