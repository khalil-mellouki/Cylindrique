"use client";

import { Folders, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { LoadingCards } from "@/components/loading-cards";
import { ProjectCard } from "@/components/project-card";
import type { Note, Project } from "@/lib/types";
import type { CreateType } from "@/lib/workspace-utils";

export function ProjectsView({
  projects,
  notes,
  search,
  loading,
  onOpenProject,
  onCreate,
}: {
  projects: Project[];
  notes: Note[];
  search: string;
  loading: boolean;
  onOpenProject: (id: string) => void;
  onCreate: (type: CreateType) => void;
}) {
  if (loading) return <LoadingCards />;

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Folders}
        title="No projects yet"
        description="Create a project to organize work and notes in this workspace."
        actionLabel="New project"
        onAction={() => onCreate("project")}
      />
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? projects.filter((project) => project.name.toLowerCase().includes(query))
    : projects;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No matches"
        description={`No projects match "${search}".`}
      />
    );
  }

  const noteCount = (id: string) =>
    notes.filter((note) => note.project_id === id).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          noteCount={noteCount(project.id)}
          onOpen={onOpenProject}
        />
      ))}
    </div>
  );
}
