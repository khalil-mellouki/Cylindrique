"use client";

import {
  Check,
  ChevronsUpDown,
  Folders,
  LayoutDashboard,
  Plus,
  StickyNote,
  Users,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import type { Project, Team } from "@/lib/types";
import { accentFromId, initials, type View } from "@/lib/workspace-utils";

const NAV: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "projects", label: "Projects", icon: Folders },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "teams", label: "Teams", icon: Users },
];

export function AppSidebar({
  teams,
  activeTeam,
  projects,
  notesCount,
  contentLoading,
  view,
  onSelectTeam,
  onNavigate,
  onOpenProject,
  onCreateTeam,
}: {
  teams: Team[];
  activeTeam: Team | null;
  projects: Project[];
  notesCount: number;
  contentLoading: boolean;
  view: View;
  onSelectTeam: (id: string) => void;
  onNavigate: (view: View) => void;
  onOpenProject: (projectId: string) => void;
  onCreateTeam: () => void;
}) {
  const counts: Record<View, number | null> = {
    dashboard: null,
    projects: projects.length,
    notes: notesCount,
    teams: teams.length,
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                {activeTeam ? (
                  <WorkspaceAvatar
                    label={initials(activeTeam.name)}
                    color={accentFromId(activeTeam.id)}
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Plus className="size-4" />
                  </div>
                )}
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">
                    {activeTeam ? activeTeam.name : "No workspace"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeTeam ? "Workspace" : "Create one to start"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56"
                align="start"
                sideOffset={6}
              >
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    className="gap-2"
                    onClick={() => onSelectTeam(team.id)}
                  >
                    <WorkspaceAvatar
                      label={initials(team.name)}
                      color={accentFromId(team.id)}
                      className="size-6 text-[10px]"
                    />
                    <span className="flex-1 truncate">{team.name}</span>
                    {team.id === activeTeam?.id ? (
                      <Check className="size-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
                {teams.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem className="gap-2" onClick={onCreateTeam}>
                  <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                    <Plus className="size-3.5" />
                  </div>
                  <span className="text-muted-foreground">New workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={view === item.key}
                    onClick={() => onNavigate(item.key)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {counts[item.key] !== null ? (
                    <SidebarMenuBadge>{counts[item.key]}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeTeam && (contentLoading || projects.length > 0) ? (
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {contentLoading && projects.length === 0
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <SidebarMenuItem key={index}>
                        <SidebarMenuSkeleton />
                      </SidebarMenuItem>
                    ))
                  : projects.slice(0, 6).map((project) => (
                      <SidebarMenuItem key={project.id}>
                        <SidebarMenuButton
                          onClick={() => onOpenProject(project.id)}
                        >
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: accentFromId(project.id) }}
                          />
                          <span className="truncate">{project.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md p-2">
          <WorkspaceAvatar label="CY" color="#18181b" shape="circle" />
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold">Cylindrique</span>
            <span className="truncate text-xs text-muted-foreground">
              Workspace demo
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
