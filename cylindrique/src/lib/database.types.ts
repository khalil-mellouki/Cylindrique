// Hand-written to match supabase/migrations/0001_auth_rbac.sql.
// Regenerate exactly once the migration is live:
//   supabase gen types typescript --project-id mqspwlizbdnujbpuclpe > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TeamRole = "owner" | "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "declined";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          bio: string | null;
          contact_email: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          website_url: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          bio?: string | null;
          contact_email?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          website_url?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          bio?: string | null;
          contact_email?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          website_url?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: { id: string; name: string; owner_id: string; created_at: string };
        Insert: { id?: string; name: string; owner_id?: string; created_at?: string };
        Update: { id?: string; name?: string; owner_id?: string; created_at?: string };
        Relationships: [];
      };
      team_members: {
        Row: { team_id: string; user_id: string; role: TeamRole; created_at: string };
        Insert: { team_id: string; user_id: string; role?: TeamRole; created_at?: string };
        Update: { team_id?: string; user_id?: string; role?: TeamRole };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          invitee_id: string;
          role: TeamRole;
          status: InviteStatus;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          invitee_id: string;
          role?: TeamRole;
          status?: InviteStatus;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: InviteStatus;
          role?: TeamRole;
        };
        Relationships: [];
      };
      team_invite_links: {
        Row: {
          id: string;
          team_id: string;
          token: string;
          role: TeamRole;
          created_by: string | null;
          expires_at: string | null;
          max_uses: number | null;
          uses: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          token?: string;
          role?: TeamRole;
          created_by?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          uses?: number;
          created_at?: string;
        };
        Update: {
          role?: TeamRole;
          expires_at?: string | null;
          max_uses?: number | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: { name?: string };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          content: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title?: string;
          content?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: { title?: string; content?: string };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          note_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          author_id?: string;
          body: string;
          created_at?: string;
        };
        Update: { body?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      accept_invite: { Args: { _invite_id: string }; Returns: string };
      decline_invite: { Args: { _invite_id: string }; Returns: undefined };
      preview_invite_link: {
        Args: { _token: string };
        Returns: {
          team_id: string | null;
          team_name: string | null;
          role: TeamRole | null;
          valid: boolean;
          already_member: boolean;
        }[];
      };
      join_team_via_link: { Args: { _token: string }; Returns: string };
      set_member_role: {
        Args: { _team_id: string; _user_id: string; _role: TeamRole };
        Returns: undefined;
      };
      leave_team: { Args: { _team_id: string }; Returns: undefined };
      remove_member: {
        Args: { _team_id: string; _user_id: string };
        Returns: undefined;
      };
      transfer_ownership: {
        Args: { _team_id: string; _new_owner: string };
        Returns: undefined;
      };
    };
    Enums: {
      team_role: TeamRole;
      invite_status: InviteStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
