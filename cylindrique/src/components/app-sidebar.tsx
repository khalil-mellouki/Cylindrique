"use client";

import {
  Check,
  ChevronsUpDown,
  Folders,
  LayoutDashboard,
  LogOut,
  Mail,
  Plus,
  StickyNote,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { UserAvatar } from "@/components/user-avatar";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { createClient } from "@/utils/supabase/client";
import type { Project, Team, TeamRole } from "@/lib/types";
import { accentFromId, initials, type View } from "@/lib/workspace-utils";

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

async function signOut() {
  try {
    await createClient().auth.signOut();
  } finally {
    window.location.assign("/login");
  }
}

export function AppSidebar({
  teams,
  activeTeam,
  projects,
  notesCount,
  membersCount,
  inboxCount,
  role,
  contentLoading,
  view,
  user,
  onSelectTeam,
  onNavigate,
  onOpenProject,
  onCreateTeam,
  onInvite,
}: {
  teams: Team[];
  activeTeam: Team | null;
  projects: Project[];
  notesCount: number;
  membersCount: number;
  inboxCount: number;
  role: TeamRole | null;
  contentLoading: boolean;
  view: View;
  user: { name: string; email: string | null; avatarUrl: string | null };
  onSelectTeam: (id: string) => void;
  onNavigate: (view: View) => void;
  onOpenProject: (projectId: string) => void;
  onCreateTeam: () => void;
  onInvite: () => void;
}) {
  const canManage = role === "owner" || role === "admin";

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-12 w-full items-center gap-2 rounded-md p-2 text-left outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 aria-expanded:bg-sidebar-accent">
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
                    {activeTeam && role ? ROLE_LABEL[role] : "Create one to start"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56" align="start" sideOffset={6}>
                <DropdownMenuGroup>
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
                </DropdownMenuGroup>
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
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "dashboard"}
                  onClick={() => onNavigate("dashboard")}
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "projects"}
                  onClick={() => onNavigate("projects")}
                >
                  <Folders />
                  <span>Projects</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{projects.length}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "notes"}
                  onClick={() => onNavigate("notes")}
                >
                  <StickyNote />
                  <span>Notes</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{notesCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "teams"}
                  onClick={() => onNavigate("teams")}
                >
                  <Users />
                  <span>Teams</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{teams.length}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeTeam ? (
          <SidebarGroup>
            <SidebarGroupLabel>Team</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === "members"}
                    onClick={() => onNavigate("members")}
                  >
                    <UsersRound />
                    <span>Members</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{membersCount}</SidebarMenuBadge>
                </SidebarMenuItem>
                {canManage ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={onInvite}>
                      <UserPlus />
                      <span>Invite people</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

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
                        <SidebarMenuButton onClick={() => onOpenProject(project.id)}>
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

        <SidebarGroup>
          <SidebarGroupLabel>You</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "invites"}
                  onClick={() => onNavigate("invites")}
                >
                  <Mail />
                  <span>Invitations</span>
                </SidebarMenuButton>
                {inboxCount > 0 ? (
                  <SidebarMenuBadge>{inboxCount}</SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "profile"}
                  onClick={() => onNavigate("profile")}
                >
                  <UserRound />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2 aria-expanded:bg-sidebar-accent">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  className="size-8"
                />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email ?? ""}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56"
                align="end"
                side="top"
                sideOffset={6}
              >
                <DropdownMenuItem onClick={() => onNavigate("profile")}>
                  <UserRound className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={signOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
