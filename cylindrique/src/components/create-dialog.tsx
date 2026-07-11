"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Note, Project, Team } from "@/lib/types";
import type { CreateType } from "@/lib/workspace-utils";

const COPY: Record<CreateType, { title: string; description: string; cta: string }> =
  {
    note: {
      title: "New note",
      description: "Add a note to one of your projects.",
      cta: "Create note",
    },
    project: {
      title: "New project",
      description: "Projects group related notes together.",
      cta: "Create project",
    },
    team: {
      title: "New team",
      description: "A team is a workspace for projects and notes.",
      cta: "Create team",
    },
  };

export function CreateDialog({
  open,
  onOpenChange,
  type,
  onTypeChange,
  projects,
  hasTeam,
  onCreateTeam,
  onCreateProject,
  onCreateNote,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CreateType;
  onTypeChange: (type: CreateType) => void;
  projects: Project[];
  hasTeam: boolean;
  onCreateTeam: (name: string) => Promise<Team | null>;
  onCreateProject: (name: string) => Promise<Project | null>;
  onCreateNote: (
    projectId: string,
    title: string,
    content: string,
  ) => Promise<Note | null>;
  onCreated: (type: CreateType, entity: Team | Project | Note) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the draft fields when the dialog transitions to open. Adjusting state
  // during render is React's documented pattern for "reset state on prop change".
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle("");
      setBody("");
      setProjectId(projects[0]?.id ?? "");
    }
  }

  const effectiveType: CreateType = hasTeam ? type : "team";
  const noProjects = projects.length === 0;
  const copy = COPY[effectiveType];
  const canSubmit =
    title.trim().length > 0 &&
    !submitting &&
    (effectiveType !== "note" || (!noProjects && projectId.length > 0));

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    let entity: Team | Project | Note | null = null;
    if (effectiveType === "note") {
      entity = await onCreateNote(projectId, title.trim(), body.trim());
    } else if (effectiveType === "project") {
      entity = await onCreateProject(title.trim());
    } else {
      entity = await onCreateTeam(title.trim());
    }
    setSubmitting(false);
    if (entity) {
      onOpenChange(false);
      onCreated(effectiveType, entity);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {hasTeam ? (
          <Tabs
            value={type}
            onValueChange={(value) => onTypeChange(value as CreateType)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="note">Note</TabsTrigger>
              <TabsTrigger value="project">Project</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-title">
              {effectiveType === "team"
                ? "Team name"
                : effectiveType === "project"
                  ? "Project name"
                  : "Title"}
            </Label>
            <Input
              id="create-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                effectiveType === "team"
                  ? "e.g. Marketing"
                  : effectiveType === "project"
                    ? "e.g. Website redesign"
                    : "Give it a name..."
              }
            />
          </div>

          {effectiveType === "note" ? (
            noProjects ? (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                You need a project first. Switch to the{" "}
                <strong className="font-medium text-foreground">Project</strong>{" "}
                tab to create one.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Project</Label>
                  <Select
                    value={projectId}
                    onValueChange={(value) => setProjectId(value ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-body">Body</Label>
                  <Textarea
                    id="create-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write your note..."
                    className="min-h-24"
                  />
                </div>
              </>
            )
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Creating…" : copy.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
