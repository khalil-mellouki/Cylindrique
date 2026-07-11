"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateDialog } from "@/components/create-dialog";
import { EmptyState } from "@/components/empty-state";
import { LoadingCards } from "@/components/loading-cards";
import { NoteEditor } from "@/components/note-editor";
import { WorkspaceHeader } from "@/components/workspace-header";
import { DashboardView } from "@/components/views/dashboard-view";
import { NotesView } from "@/components/views/notes-view";
import { ProjectsView } from "@/components/views/projects-view";
import { TeamsView } from "@/components/views/teams-view";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Note, Project, Team } from "@/lib/types";
import type { CreateType, View } from "@/lib/workspace-utils";

export function Workspace() {
  const ws = useWorkspace();
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<CreateType>("note");

  const activeTeam = useMemo(
    () => ws.teams.find((team) => team.id === ws.activeTeamId) ?? null,
    [ws.teams, ws.activeTeamId],
  );

  const projectName = useMemo(() => {
    const map = new Map(ws.projects.map((project) => [project.id, project.name]));
    return (id: string) => map.get(id) ?? "Unknown project";
  }, [ws.projects]);

  const selectedNote = useMemo(
    () => ws.notes.find((note) => note.id === selectedNoteId) ?? null,
    [ws.notes, selectedNoteId],
  );

  function navigate(next: View) {
    setView(next);
    setSearch("");
    setFilterProjectId(null);
  }

  function openProjectNotes(projectId: string) {
    setView("notes");
    setFilterProjectId(projectId);
    setSearch("");
  }

  function openCreate(nextType: CreateType) {
    setCreateType(nextType);
    setCreateOpen(true);
  }

  function handleNew() {
    if (!activeTeam) {
      openCreate("team");
      return;
    }
    openCreate(
      view === "projects" ? "project" : view === "teams" ? "team" : "note",
    );
  }

  function handleCreated(type: CreateType, entity: Team | Project | Note) {
    if (type === "note") {
      setView("notes");
      setFilterProjectId(null);
      setSearch("");
      setSelectedNoteId((entity as Note).id);
    } else if (type === "project") {
      navigate("projects");
    } else {
      navigate("dashboard");
    }
  }

  function renderView() {
    if (ws.teamsLoading) return <LoadingCards />;
    if (!activeTeam) {
      return (
        <EmptyState
          icon={Users}
          title="Create your first workspace"
          description="Workspaces hold your projects and notes. Create one to get started."
          actionLabel="New workspace"
          onAction={() => openCreate("team")}
        />
      );
    }
    switch (view) {
      case "dashboard":
        return (
          <DashboardView
            activeTeam={activeTeam}
            projects={ws.projects}
            notes={ws.notes}
            loading={ws.contentLoading}
            projectName={projectName}
            onOpenProject={openProjectNotes}
            onOpenNote={(note) => setSelectedNoteId(note.id)}
            onNavigate={navigate}
          />
        );
      case "projects":
        return (
          <ProjectsView
            projects={ws.projects}
            notes={ws.notes}
            search={search}
            loading={ws.contentLoading}
            onOpenProject={openProjectNotes}
            onCreate={openCreate}
          />
        );
      case "notes":
        return (
          <NotesView
            notes={ws.notes}
            projects={ws.projects}
            filterProjectId={filterProjectId}
            search={search}
            loading={ws.contentLoading}
            projectName={projectName}
            onOpenNote={(note) => setSelectedNoteId(note.id)}
            onCreate={openCreate}
          />
        );
      case "teams":
        return (
          <TeamsView
            teams={ws.teams}
            activeTeamId={ws.activeTeamId}
            projects={ws.projects}
            notes={ws.notes}
            onSelectTeam={ws.selectTeam}
          />
        );
      default:
        return null;
    }
  }

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar
        teams={ws.teams}
        activeTeam={activeTeam}
        projects={ws.projects}
        notesCount={ws.notes.length}
        contentLoading={ws.contentLoading}
        view={view}
        onSelectTeam={ws.selectTeam}
        onNavigate={navigate}
        onOpenProject={openProjectNotes}
        onCreateTeam={() => openCreate("team")}
      />
      <SidebarInset className="flex h-svh min-w-0 flex-col overflow-hidden">
        <WorkspaceHeader
          view={view}
          activeTeam={activeTeam}
          teamsCount={ws.teams.length}
          projects={ws.projects}
          notes={ws.notes}
          filterProjectId={filterProjectId}
          projectName={projectName}
          search={search}
          onSearch={setSearch}
          onClearFilter={() => setFilterProjectId(null)}
          onNew={handleNew}
          hasTeam={!!activeTeam}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {renderView()}
          </div>
        </div>
      </SidebarInset>

      <NoteEditor
        note={selectedNote}
        projectName={
          selectedNote ? projectName(selectedNote.project_id) : ""
        }
        onClose={() => setSelectedNoteId(null)}
        onSave={ws.updateNote}
        onDelete={async (id) => {
          const ok = await ws.deleteNote(id);
          if (ok) setSelectedNoteId(null);
        }}
      />
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        type={createType}
        onTypeChange={setCreateType}
        projects={ws.projects}
        hasTeam={!!activeTeam}
        onCreateTeam={ws.createTeam}
        onCreateProject={ws.createProject}
        onCreateNote={ws.createNote}
        onCreated={handleCreated}
      />
    </SidebarProvider>
  );
}
