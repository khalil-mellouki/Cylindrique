// Domain types mirroring the Cylindrique API responses.
// `created_at` / `updated_at` arrive as ISO 8601 strings.

export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  team_id: string;
  name: string;
  created_at: string;
}

export interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

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
