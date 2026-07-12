// Domain types, aliased from the generated Supabase Database type so the app
// and the database stay in sync. Timestamps are ISO strings.

import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Team = Tables["teams"]["Row"];
export type Project = Tables["projects"]["Row"];
export type Note = Tables["notes"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type Comment = Tables["comments"]["Row"];
export type TeamMember = Tables["team_members"]["Row"];
export type TeamInvite = Tables["team_invites"]["Row"];
export type TeamInviteLink = Tables["team_invite_links"]["Row"];
export type TeamRole = Database["public"]["Enums"]["team_role"];

// --- Request payloads ---
export interface TeamCreate {
  name: string;
}
export interface ProjectCreate {
  name: string;
}
export interface NoteCreate {
  title: string;
  content?: string;
}
export interface NoteUpdate {
  title?: string;
  content?: string;
}
export interface ProfileUpdate {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  contact_email?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  avatar_url?: string | null;
}

// --- Compact profile used wherever we show a person ---
export type ProfileSummary = Pick<
  Profile,
  "id" | "username" | "full_name" | "avatar_url"
>;

// --- Joined view models ---
export type TeamMemberWithProfile = TeamMember & {
  profile: ProfileSummary | null;
};
export type InviteWithContext = TeamInvite & {
  team: Pick<Team, "id" | "name"> | null;
  inviter: Pick<Profile, "username" | "full_name"> | null;
};
export type CommentWithAuthor = Comment & {
  author: ProfileSummary | null;
};
export type InviteLinkPreview = {
  team_id: string | null;
  team_name: string | null;
  role: TeamRole | null;
  valid: boolean;
  already_member: boolean;
};
