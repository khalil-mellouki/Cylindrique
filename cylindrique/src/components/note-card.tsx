"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Note } from "@/lib/types";
import {
  accentFromId,
  cardActivation,
  formatRelative,
} from "@/lib/workspace-utils";

export function NoteCard({
  note,
  projectName,
  onOpen,
}: {
  note: Note;
  projectName: string;
  onOpen: (note: Note) => void;
}) {
  return (
    <Card
      {...cardActivation(() => onOpen(note))}
      className="h-full cursor-pointer transition hover:ring-foreground/20"
    >
      <CardHeader>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: accentFromId(note.project_id) }}
          />
          <span className="truncate">{projectName}</span>
        </div>
        <CardTitle className="truncate">{note.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {note.content || "No content yet."}
        </p>
      </CardContent>
      <CardFooter className="justify-end text-xs text-muted-foreground">
        {formatRelative(note.updated_at)}
      </CardFooter>
    </Card>
  );
}
