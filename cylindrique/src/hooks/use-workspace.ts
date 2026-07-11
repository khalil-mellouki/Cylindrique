"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { Note, Project, Team } from "@/lib/types";

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
}

/**
 * Owns all workspace data and CRUD, backed by the live API.
 *
 * Notes are aggregated per active team by fetching each project's notes — the
 * backend only exposes notes per project. Fine at this scale; documented as a
 * trade-off.
 */
export function useWorkspace(): UseWorkspace {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);

  // Load teams once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      setTeamsLoading(true);
      try {
        const data = await api.teams.list();
        if (!active) return;
        setTeams(data);
        setActiveTeamId((prev) => prev ?? data[0]?.id ?? null);
      } catch (error) {
        if (active) toast.error(errorMessage(error, "Failed to load teams"));
      } finally {
        if (active) setTeamsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load projects + notes whenever the active team changes.
  useEffect(() => {
    if (!activeTeamId) {
      setProjects([]);
      setNotes([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const teamProjects = await api.projects.list(activeTeamId);
        if (!active) return;
        let teamNotes: Note[];
        try {
          teamNotes = await api.notes.listByTeam(activeTeamId);
        } catch {
          // Fallback if the aggregated endpoint isn't deployed yet.
          const lists = await Promise.all(
            teamProjects.map((project) => api.notes.list(project.id)),
          );
          teamNotes = lists.flat();
        }
        if (!active) return;
        setProjects(teamProjects);
        setNotes(teamNotes);
      } catch (error) {
        if (active) {
          setProjects([]);
          setNotes([]);
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

  // Content is "loading" until the active team's data has been fetched. Deriving
  // this (instead of a separate flag) removes the flash of empty state between a
  // team becoming active and the fetch effect starting.
  const contentLoading = activeTeamId !== null && activeTeamId !== loadedTeamId;

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
    teamsLoading,
    contentLoading,
    selectTeam,
    createTeam,
    createProject,
    createNote,
    updateNote,
    deleteNote,
  };
}
