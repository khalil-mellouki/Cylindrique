// Typed fetch wrapper around the FastAPI backend.
// Base URL comes from NEXT_PUBLIC_API_URL (see .env.example); defaults to the
// local backend so `npm run dev` works out of the box.

import type {
  Note,
  NoteCreate,
  NoteUpdate,
  Project,
  ProjectCreate,
  Team,
  TeamCreate,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Error carrying the HTTP status and the backend's `detail` message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* response body wasn't JSON; keep the status text */
    }
    throw new ApiError(detail || "Request failed", response.status);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --- Generic verb helpers ---

export const apiGet = <T>(path: string) => request<T>(path, { method: "GET" });

export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const apiDelete = (path: string) =>
  request<void>(path, { method: "DELETE" });

// --- Endpoint-specific, fully typed helpers ---

export const api = {
  teams: {
    list: () => apiGet<Team[]>("/api/teams"),
    create: (data: TeamCreate) => apiPost<Team>("/api/teams", data),
  },
  projects: {
    list: (teamId: string) => apiGet<Project[]>(`/api/teams/${teamId}/projects`),
    create: (teamId: string, data: ProjectCreate) =>
      apiPost<Project>(`/api/teams/${teamId}/projects`, data),
  },
  notes: {
    list: (projectId: string) =>
      apiGet<Note[]>(`/api/projects/${projectId}/notes`),
    create: (projectId: string, data: NoteCreate) =>
      apiPost<Note>(`/api/projects/${projectId}/notes`, data),
    update: (noteId: string, data: NoteUpdate) =>
      apiPut<Note>(`/api/notes/${noteId}`, data),
    remove: (noteId: string) => apiDelete(`/api/notes/${noteId}`),
  },
};
