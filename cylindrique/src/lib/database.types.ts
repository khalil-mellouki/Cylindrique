export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          note_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          note_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contact_email: string | null
          created_at: string
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          updated_at: string
          username: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          full_name?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          updated_at?: string
          username: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          updated_at?: string
          username?: string
          website_url?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invite_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          token: string
          uses: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          token?: string
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          token?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_invite_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invite_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          invitee_id: string
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["invite_status"]
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          invitee_id: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          invitee_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _invite_id: string }; Returns: string }
      can_access_note: { Args: { _note_id: string }; Returns: boolean }
      can_access_project: { Args: { _project_id: string }; Returns: boolean }
      can_manage_team: { Args: { _team_id: string }; Returns: boolean }
      decline_invite: { Args: { _invite_id: string }; Returns: undefined }
      invite_inbox: {
        Args: never
        Returns: {
          created_at: string
          id: string
          invited_by_name: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          team_name: string
        }[]
      }
      is_team_member: { Args: { _team_id: string }; Returns: boolean }
      is_team_owner: { Args: { _team_id: string }; Returns: boolean }
      join_team_via_link: { Args: { _token: string }; Returns: string }
      leave_team: { Args: { _team_id: string }; Returns: undefined }
      preview_invite_link: {
        Args: { _token: string }
        Returns: {
          already_member: boolean
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          team_name: string
          valid: boolean
        }[]
      }
      remove_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: undefined
      }
      set_member_role: {
        Args: {
          _role: Database["public"]["Enums"]["team_role"]
          _team_id: string
          _user_id: string
        }
        Returns: undefined
      }
      team_of_note: { Args: { _note_id: string }; Returns: string }
      team_of_project: { Args: { _project_id: string }; Returns: string }
      team_role: {
        Args: { _team_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      team_role_of: {
        Args: { _team_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      transfer_ownership: {
        Args: { _new_owner: string; _team_id: string }
        Returns: undefined
      }
    }
    Enums: {
      invite_status: "pending" | "accepted" | "declined"
      team_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invite_status: ["pending", "accepted", "declined"],
      team_role: ["owner", "admin", "member"],
    },
  },
} as const

