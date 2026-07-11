"use client";

import { Check, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import type { Note, Project, Team } from "@/lib/types";
import {
  accentFromId,
  cardActivation,
  formatRelative,
  initials,
} from "@/lib/workspace-utils";

export function TeamsView({
  teams,
  activeTeamId,
  projects,
  notes,
  onSelectTeam,
}: {
  teams: Team[];
  activeTeamId: string | null;
  projects: Project[];
  notes: Note[];
  onSelectTeam: (id: string) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {teams.map((team) => {
        const isActive = team.id === activeTeamId;
        // Only the active team's projects/notes are loaded, so show live counts
        // for it and a created date for the others.
        const meta = isActive
          ? `${projects.length} project${projects.length === 1 ? "" : "s"} · ${notes.length} note${notes.length === 1 ? "" : "s"}`
          : `Created ${formatRelative(team.created_at)}`;

        return (
          <Card
            key={team.id}
            {...cardActivation(() => onSelectTeam(team.id))}
            className="flex-row items-center gap-4 px-5 cursor-pointer transition hover:ring-foreground/20"
          >
            <WorkspaceAvatar
              label={initials(team.name)}
              color={accentFromId(team.id)}
              className="size-11 rounded-lg text-base after:rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{team.name}</span>
                {isActive ? (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="size-3" />
                    Current
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{meta}</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Card>
        );
      })}
    </div>
  );
}
