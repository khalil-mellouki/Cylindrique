"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type {
  InviteInboxRow,
  Note,
  Project,
  Team,
  TeamMemberWithProfile,
  TeamRole,
} from "@/lib/types";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export interface UseWorkspace {
  teams: Team[];
  activeTeamId: string | null;
  projects: Project[];
  notes: Note[];
  members: TeamMemberWithProfile[];
  role: TeamRole | null;
  inbox: InviteInboxRow[];
  teamsLoading: boolean;
  contentLoading: boolean;
  selectTeam: (id: string) => void;
  createTeam: (name: string) => Promise<Team | null>;
  createProject: (name: string) => Promise<Project | null>;
  createNote: (
    projectId: string,
    title: string,
    content: string,
  ) => Promise<Note | null>;
  updateNote: (
    id: string,
    data: { title?: string; content?: string },
  ) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
  refreshTeams: (selectId?: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshInbox: () => Promise<void>;
}

/** Owns all workspace data + CRUD, backed by Supabase (RLS enforces access). */
export function useWorkspace(userId: string): UseWorkspace {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [inbox, setInbox] = useState<InviteInboxRow[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);

  const refreshTeams = useCallback(async (selectId?: string) => {
    try {
      const data = await api.teams.list();
      setTeams(data);
      setActiveTeamId((prev) => selectId ?? prev ?? data[0]?.id ?? null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load teams"));
    }
  }, []);

  const refreshInbox = useCallback(async () => {
    try {
      setInbox(await api.invites.inbox());
    } catch {
      // Non-fatal; the inbox badge just won't show.
    }
  }, []);

  const refreshMembers = useCallback(async () => {
    if (!activeTeamId) {
      setMembers([]);
      return;
    }
    try {
      setMembers(await api.members.list(activeTeamId));
    } catch {
      setMembers([]);
    }
  }, [activeTeamId]);

  // Initial load: teams + invite inbox.
  useEffect(() => {
    let active = true;
    (async () => {
      setTeamsLoading(true);
      await refreshTeams();
      await refreshInbox();
      if (active) setTeamsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshTeams, refreshInbox]);

  // Load projects + notes + members whenever the active team changes.
  useEffect(() => {
    if (!activeTeamId) {
      setProjects([]);
      setNotes([]);
      setMembers([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [teamProjects, teamNotes, teamMembers] = await Promise.all([
          api.projects.list(activeTeamId),
          api.notes.listByTeam(activeTeamId),
          api.members.list(activeTeamId),
        ]);
        if (!active) return;
        setProjects(teamProjects);
        setNotes(teamNotes);
        setMembers(teamMembers);
      } catch (error) {
        if (active) {
          setProjects([]);
          setNotes([]);
          setMembers([]);
          toast.error(errorMessage(error, "Failed to load workspace"));
        }
      } finally {
        if (active) setLoadedTeamId(activeTeamId);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeTeamId]);

  const contentLoading = activeTeamId !== null && activeTeamId !== loadedTeamId;
  const role = members.find((m) => m.user_id === userId)?.role ?? null;

  const selectTeam = useCallback((id: string) => setActiveTeamId(id), []);

  const createTeam = useCallback(async (name: string) => {
    try {
      const team = await api.teams.create({ name });
      setTeams((prev) => [...prev, team]);
      setActiveTeamId(team.id);
      toast.success(`Team "${team.name}" created`);
      return team;
    } catch (error) {
      toast.error(errorMessage(error, "Failed to create team"));
      return null;
    }
  }, []);

  const createProject = useCallback(
    async (name: string) => {
      if (!activeTeamId) return null;
      try {
        const project = await api.projects.create(activeTeamId, { name });
        setProjects((prev) => [project, ...prev]);
        toast.success(`Project "${project.name}" created`);
        return project;
      } catch (error) {
        toast.error(errorMessage(error, "Failed to create project"));
        return null;
      }
    },
    [activeTeamId],
  );

  const createNote = useCallback(
    async (projectId: string, title: string, content: string) => {
      try {
        const note = await api.notes.create(projectId, { title, content });
        setNotes((prev) => [note, ...prev]);
        toast.success("Note created");
        return note;
      } catch (error) {
        toast.error(errorMessage(error, "Failed to create note"));
        return null;
      }
    },
    [],
  );

  const updateNote = useCallback(
    async (id: string, data: { title?: string; content?: string }) => {
      try {
        const note = await api.notes.update(id, data);
        setNotes((prev) => prev.map((item) => (item.id === id ? note : item)));
        return note;
      } catch (error) {
        toast.error(errorMessage(error, "Failed to save note"));
        return null;
      }
    },
    [],
  );

  const deleteNote = useCallback(async (id: string) => {
    try {
      await api.notes.remove(id);
      setNotes((prev) => prev.filter((item) => item.id !== id));
      toast.success("Note deleted");
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete note"));
      return false;
    }
  }, []);

  return {
    teams,
    activeTeamId,
    projects,
    notes,
    members,
    role,
    inbox,
    teamsLoading,
    contentLoading,
    selectTeam,
    createTeam,
    createProject,
    createNote,
    updateNote,
    deleteNote,
    refreshTeams,
    refreshMembers,
    refreshInbox,
  };
}
