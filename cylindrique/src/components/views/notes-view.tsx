"use client";

import { NotebookPen, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { LoadingCards } from "@/components/loading-cards";
import { NoteCard } from "@/components/note-card";
import type { Note, Project } from "@/lib/types";
import type { CreateType } from "@/lib/workspace-utils";

export function NotesView({
  notes,
  projects,
  filterProjectId,
  search,
  loading,
  projectName,
  onOpenNote,
  onCreate,
}: {
  notes: Note[];
  projects: Project[];
  filterProjectId: string | null;
  search: string;
  loading: boolean;
  projectName: (id: string) => string;
  onOpenNote: (note: Note) => void;
  onCreate: (type: CreateType) => void;
}) {
  if (loading) return <LoadingCards />;

  const noProjects = projects.length === 0;
  const base = filterProjectId
    ? notes.filter((note) => note.project_id === filterProjectId)
    : notes;

  if (base.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title={noProjects ? "No projects yet" : "No notes here yet"}
        description={
          noProjects
            ? "Create a project first — notes live inside projects."
            : "Capture ideas, decisions, and research for this workspace."
        }
        actionLabel={noProjects ? "New project" : "New note"}
        onAction={() => onCreate(noProjects ? "project" : "note")}
      />
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? base.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query),
      )
    : base;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No matches"
        description={`No notes match "${search}".`}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          projectName={projectName(note.project_id)}
          onOpen={onOpenNote}
        />
      ))}
    </div>
  );
}
