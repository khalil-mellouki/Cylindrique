"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, StickyNote, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Note } from "@/lib/types";
import { formatRelative } from "@/lib/workspace-utils";

export function NoteEditor({
  note,
  projectName,
  onClose,
  onSave,
  onDelete,
}: {
  note: Note | null;
  projectName: string;
  onClose: () => void;
  onSave: (
    id: string,
    data: { title?: string; content?: string },
  ) => Promise<Note | null>;
  onDelete: (id: string) => void;
}) {
  return (
    <Sheet
      open={note !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {note ? (
          <NoteEditorForm
            key={note.id}
            note={note}
            projectName={projectName}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function NoteEditorForm({
  note,
  projectName,
  onSave,
  onDelete,
}: {
  note: Note;
  projectName: string;
  onSave: (
    id: string,
    data: { title?: string; content?: string },
  ) => Promise<Note | null>;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const skipFirst = useRef(true);

  // Debounced autosave whenever the title or body changes.
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    setStatus("saving");
    const timer = setTimeout(async () => {
      const payload: { title?: string; content?: string } = { content };
      if (title.trim()) payload.title = title.trim();
      await onSave(note.id, payload);
      setStatus("saved");
    }, 700);
    return () => clearTimeout(timer);
  }, [title, content, note.id, onSave]);

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="sr-only">Edit note</SheetTitle>
        <SheetDescription className="sr-only">
          Edit the title and body of this note.
        </SheetDescription>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StickyNote className="size-3.5" />
          <span className="truncate">{projectName}</span>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Note title"
          className="h-auto rounded-none border-0 px-0 py-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <p className="text-xs text-muted-foreground">
          Edited {formatRelative(note.updated_at)}
        </p>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Start writing..."
          className="min-h-64 flex-1 resize-none border-0 px-0 py-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="flex items-center justify-between border-t p-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === "saving" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Saved
            </>
          )}
        </span>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
            <Trash2 />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                This can&apos;t be undone. &ldquo;{note.title}&rdquo; will be
                permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => onDelete(note.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
