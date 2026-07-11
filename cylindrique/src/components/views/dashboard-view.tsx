"use client";

import { ArrowRight, Clock, Folders, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingCards } from "@/components/loading-cards";
import { ProjectCard } from "@/components/project-card";
import type { Note, Project, Team } from "@/lib/types";
import { accentFromId, formatRelative, type View } from "@/lib/workspace-utils";

export function DashboardView({
  activeTeam,
  projects,
  notes,
  loading,
  projectName,
  onOpenProject,
  onOpenNote,
  onNavigate,
}: {
  activeTeam: Team;
  projects: Project[];
  notes: Note[];
  loading: boolean;
  projectName: (id: string) => string;
  onOpenProject: (id: string) => void;
  onOpenNote: (note: Note) => void;
  onNavigate: (view: View) => void;
}) {
  if (loading) return <LoadingCards />;

  const recentNotes = [...notes]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);
  const lastActivity = recentNotes[0]
    ? formatRelative(recentNotes[0].updated_at)
    : "—";
  const noteCount = (id: string) =>
    notes.filter((note) => note.project_id === id).length;
  const recentProjects = projects.slice(0, 3);

  const stats = [
    { label: "Projects", value: String(projects.length), icon: Folders },
    { label: "Notes", value: String(notes.length), icon: StickyNote },
    { label: "Last activity", value: lastActivity, icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </span>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent projects</h2>
          {projects.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("projects")}
            >
              View all
              <ArrowRight />
            </Button>
          ) : null}
        </div>
        {recentProjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                noteCount={noteCount(project.id)}
                onOpen={onOpenProject}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No projects in {activeTeam.name} yet.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Recent notes</h2>
        {recentNotes.length > 0 ? (
          <Card className="p-2">
            <div className="flex flex-col">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onOpenNote(note)}
                  className="flex items-start gap-3 rounded-lg p-3 text-left transition hover:bg-muted"
                >
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: accentFromId(note.project_id) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {note.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {projectName(note.project_id)} ·{" "}
                      {formatRelative(note.updated_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No notes yet.
          </p>
        )}
      </section>
    </div>
  );
}
