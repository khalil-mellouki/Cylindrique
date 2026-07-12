"use client";

import { Plus, Search } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Note, Project, Team } from "@/lib/types";
import type { View } from "@/lib/workspace-utils";

export function WorkspaceHeader({
  view,
  activeTeam,
  teamsCount,
  projects,
  notes,
  filterProjectId,
  projectName,
  search,
  onSearch,
  onClearFilter,
  onNew,
  hasTeam,
}: {
  view: View;
  activeTeam: Team | null;
  teamsCount: number;
  projects: Project[];
  notes: Note[];
  filterProjectId: string | null;
  projectName: (id: string) => string;
  search: string;
  onSearch: (value: string) => void;
  onClearFilter: () => void;
  onNew: () => void;
  hasTeam: boolean;
}) {
  const notesShown = filterProjectId
    ? notes.filter((note) => note.project_id === filterProjectId).length
    : notes.length;

  let title: string;
  let subtitle: string;
  if (view === "dashboard") {
    title = "Dashboard";
    subtitle = activeTeam ? `Overview of ${activeTeam.name}` : "Your workspace";
  } else if (view === "projects") {
    title = "Projects";
    subtitle = `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  } else if (view === "notes") {
    title = filterProjectId ? projectName(filterProjectId) : "Notes";
    subtitle = `${notesShown} note${notesShown === 1 ? "" : "s"}`;
  } else if (view === "teams") {
    title = "Teams";
    subtitle = `${teamsCount} workspace${teamsCount === 1 ? "" : "s"}`;
  } else if (view === "members") {
    title = "Members";
    subtitle = activeTeam ? activeTeam.name : "";
  } else if (view === "invites") {
    title = "Invitations";
    subtitle = "Accept invites or join with a link";
  } else {
    title = "Profile";
    subtitle = "Your public profile";
  }

  const searchable =
    hasTeam && (view === "projects" || view === "notes" || view === "teams");
  const showNew =
    view === "dashboard" ||
    view === "projects" ||
    view === "notes" ||
    view === "teams";
  const newLabel = !hasTeam
    ? "New team"
    : view === "projects"
      ? "New project"
      : view === "teams"
        ? "New team"
        : "New note";

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <SidebarTrigger className="text-muted-foreground" />
      <div className="min-w-0 flex-1">
        {view === "notes" && filterProjectId ? (
          <Breadcrumb>
            <BreadcrumbList className="mb-0.5 gap-1 text-xs sm:gap-1.5">
              <BreadcrumbItem>{activeTeam?.name ?? "Workspace"}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <button
                  className="transition-colors hover:text-foreground"
                  onClick={onClearFilter}
                >
                  Notes
                </button>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <h1 className="truncate text-base font-semibold leading-tight">
          {title}
        </h1>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {searchable ? (
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search..."
            className="h-9 w-40 pl-8 lg:w-60"
          />
        </div>
      ) : null}

      {showNew ? (
        <Button className="h-9" onClick={onNew}>
          <Plus />
          <span className="hidden sm:inline">{newLabel}</span>
        </Button>
      ) : null}
    </header>
  );
}
