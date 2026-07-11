"use client";

import { ChevronRight, StickyNote } from "lucide-react";

import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import type { Project } from "@/lib/types";
import {
  accentFromId,
  cardActivation,
  formatRelative,
  initials,
} from "@/lib/workspace-utils";

export function ProjectCard({
  project,
  noteCount,
  onOpen,
}: {
  project: Project;
  noteCount: number;
  onOpen: (id: string) => void;
}) {
  return (
    <Card
      {...cardActivation(() => onOpen(project.id))}
      className="cursor-pointer transition hover:ring-foreground/20"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <WorkspaceAvatar
            label={initials(project.name)}
            color={accentFromId(project.id)}
          />
          <div className="min-w-0">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <p className="truncate text-xs text-muted-foreground">
              Created {formatRelative(project.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <StickyNote className="size-3.5" />
          {noteCount} note{noteCount === 1 ? "" : "s"}
        </span>
        <ChevronRight className="size-4" />
      </CardFooter>
    </Card>
  );
}
