// Data layer: typed Supabase queries. RLS on the database is the security
// boundary — these helpers just express intent; the DB decides what's allowed.

import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/client";
import type {
  Comment,
  CommentWithAuthor,
  InviteLinkPreview,
  Note,
  NoteCreate,
  NoteUpdate,
  Profile,
  ProfileSummary,
  ProfileUpdate,
  Project,
  ProjectCreate,
  Team,
  TeamCreate,
  TeamInvite,
  TeamInviteLink,
  TeamMemberWithProfile,
  TeamRole,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Lazily create the browser client (avoids running during SSR of client comps).
let _client: ReturnType<typeof createClient> | null = null;
function sb() {
  return (_client ??= createClient());
}

async function uid(): Promise<string> {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new ApiError("Not signed in", 401);
  return data.user.id;
}

function one<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw new ApiError(result.error.message, 400);
  if (result.data === null) throw new ApiError("Not found", 404);
  return result.data;
}
function many<T>(result: { data: T[] | null; error: PostgrestError | null }): T[] {
  if (result.error) throw new ApiError(result.error.message, 400);
  return result.data ?? [];
}
function ok(error: PostgrestError | null): void {
  if (error) throw new ApiError(error.message, 400);
}

const PROFILE_COLS = "id, username, full_name, avatar_url";

export const api = {
  teams: {
    list: async (): Promise<Team[]> =>
      many(await sb().from("teams").select("*").order("created_at")),
    create: async (data: TeamCreate): Promise<Team> =>
      one(await sb().from("teams").insert({ name: data.name }).select().single()),
    remove: async (id: string): Promise<void> =>
      ok((await sb().from("teams").delete().eq("id", id)).error),
  },

  projects: {
    list: async (teamId: string): Promise<Project[]> =>
      many(
        await sb().from("projects").select("*").eq("team_id", teamId).order("created_at"),
      ),
    create: async (teamId: string, data: ProjectCreate): Promise<Project> =>
      one(
        await sb()
          .from("projects")
          .insert({ team_id: teamId, name: data.name })
          .select()
          .single(),
      ),
    remove: async (id: string): Promise<void> =>
      ok((await sb().from("projects").delete().eq("id", id)).error),
  },

  notes: {
    list: async (projectId: string): Promise<Note[]> =>
      many(
        await sb().from("notes").select("*").eq("project_id", projectId).order("created_at"),
      ),
    // All notes across a team (RLS-scoped). Two small queries keeps it fully typed.
    listByTeam: async (teamId: string): Promise<Note[]> => {
      const projects = many<{ id: string }>(
        await sb().from("projects").select("id").eq("team_id", teamId),
      );
      const ids = projects.map((p) => p.id);
      if (ids.length === 0) return [];
      return many(
        await sb().from("notes").select("*").in("project_id", ids).order("created_at"),
      );
    },
    create: async (projectId: string, data: NoteCreate): Promise<Note> =>
      one(
        await sb()
          .from("notes")
          .insert({ project_id: projectId, title: data.title, content: data.content ?? "" })
          .select()
          .single(),
      ),
    update: async (id: string, data: NoteUpdate): Promise<Note> => {
      const patch: NoteUpdate = {};
      if (data.title !== undefined) patch.title = data.title;
      if (data.content !== undefined) patch.content = data.content;
      return one(await sb().from("notes").update(patch).eq("id", id).select().single());
    },
    remove: async (id: string): Promise<void> =>
      ok((await sb().from("notes").delete().eq("id", id)).error),
  },

  profiles: {
    getMine: async (): Promise<Profile> =>
      one(await sb().from("profiles").select("*").eq("id", await uid()).single()),
    getByUsername: async (username: string): Promise<Profile | null> => {
      const { data, error } = await sb()
        .from("profiles")
        .select("*")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (error) throw new ApiError(error.message, 400);
      return data;
    },
    search: async (query: string): Promise<ProfileSummary[]> => {
      const q = query.trim();
      if (q.length < 2) return [];
      return many(
        await sb()
          .from("profiles")
          .select(PROFILE_COLS)
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(10),
      );
    },
    update: async (data: ProfileUpdate): Promise<Profile> =>
      one(
        await sb().from("profiles").update(data).eq("id", await uid()).select().single(),
      ),
    uploadAvatar: async (file: Blob, ext: string): Promise<string> => {
      const userId = await uid();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await sb()
        .storage.from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw new ApiError(error.message, 400);
      const { data } = sb().storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    },
  },

  members: {
    list: async (teamId: string): Promise<TeamMemberWithProfile[]> =>
      many(
        await sb()
          .from("team_members")
          .select(`*, profile:profiles(${PROFILE_COLS})`)
          .eq("team_id", teamId),
      ) as unknown as TeamMemberWithProfile[],
    setRole: async (teamId: string, userId: string, role: TeamRole): Promise<void> =>
      ok(
        (await sb().rpc("set_member_role", {
          _team_id: teamId,
          _user_id: userId,
          _role: role,
        })).error,
      ),
    remove: async (teamId: string, userId: string): Promise<void> =>
      ok((await sb().rpc("remove_member", { _team_id: teamId, _user_id: userId })).error),
    leave: async (teamId: string): Promise<void> =>
      ok((await sb().rpc("leave_team", { _team_id: teamId })).error),
    transfer: async (teamId: string, newOwner: string): Promise<void> =>
      ok((await sb().rpc("transfer_ownership", { _team_id: teamId, _new_owner: newOwner })).error),
  },

  invites: {
    inbox: async () => many(await sb().rpc("invite_inbox")),
    listForTeam: async (teamId: string): Promise<TeamInvite[]> =>
      many(
        await sb()
          .from("team_invites")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "pending")
          .order("created_at"),
      ),
    send: async (teamId: string, inviteeId: string, role: TeamRole): Promise<TeamInvite> =>
      one(
        await sb()
          .from("team_invites")
          .insert({ team_id: teamId, invitee_id: inviteeId, role, invited_by: await uid() })
          .select()
          .single(),
      ),
    accept: async (inviteId: string): Promise<string> => {
      const { data, error } = await sb().rpc("accept_invite", { _invite_id: inviteId });
      if (error) throw new ApiError(error.message, 400);
      return data as string;
    },
    decline: async (inviteId: string): Promise<void> =>
      ok((await sb().rpc("decline_invite", { _invite_id: inviteId })).error),
    revoke: async (inviteId: string): Promise<void> =>
      ok((await sb().from("team_invites").delete().eq("id", inviteId)).error),
  },

  links: {
    listForTeam: async (teamId: string): Promise<TeamInviteLink[]> =>
      many(
        await sb()
          .from("team_invite_links")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at"),
      ),
    create: async (teamId: string, role: TeamRole): Promise<TeamInviteLink> =>
      one(
        await sb()
          .from("team_invite_links")
          .insert({ team_id: teamId, role })
          .select()
          .single(),
      ),
    revoke: async (id: string): Promise<void> =>
      ok((await sb().from("team_invite_links").delete().eq("id", id)).error),
    preview: async (token: string): Promise<InviteLinkPreview> => {
      const { data, error } = await sb().rpc("preview_invite_link", { _token: token });
      if (error) throw new ApiError(error.message, 400);
      return (data?.[0] ?? {
        team_id: null,
        team_name: null,
        role: null,
        valid: false,
        already_member: false,
      }) as InviteLinkPreview;
    },
    join: async (token: string): Promise<string> => {
      const { data, error } = await sb().rpc("join_team_via_link", { _token: token });
      if (error) throw new ApiError(error.message, 400);
      return data as string;
    },
  },

  comments: {
    list: async (noteId: string): Promise<CommentWithAuthor[]> =>
      many(
        await sb()
          .from("comments")
          .select(`*, author:profiles(${PROFILE_COLS})`)
          .eq("note_id", noteId)
          .order("created_at"),
      ) as unknown as CommentWithAuthor[],
    add: async (noteId: string, body: string): Promise<Comment> =>
      one(
        await sb().from("comments").insert({ note_id: noteId, body }).select().single(),
      ),
    remove: async (id: string): Promise<void> =>
      ok((await sb().from("comments").delete().eq("id", id)).error),
  },
};
