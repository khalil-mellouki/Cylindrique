"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { api, ApiError } from "@/lib/api";
import type { CommentWithAuthor } from "@/lib/types";
import { formatRelative } from "@/lib/workspace-utils";
import { toast } from "sonner";

export function CommentSection({ noteId }: { noteId: string }) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await api.comments.list(noteId);
      setComments(rows);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load comments");
    }
  }, [noteId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.comments
      .list(noteId)
      .then((rows) => {
        if (active) setComments(rows);
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error instanceof ApiError ? error.message : "Failed to load comments",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [noteId]);

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await api.comments.add(noteId, trimmed);
      setBody("");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>Comments</span>
        <span className="text-muted-foreground">{comments.length}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 pr-3">
            {comments.map((comment) => {
              const name =
                comment.author?.full_name || comment.author?.username || "Someone";
              return (
                <div key={comment.id} className="flex gap-2.5">
                  <UserAvatar
                    name={name}
                    avatarUrl={comment.author?.avatar_url ?? null}
                    className="size-7"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(comment.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {comment.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment..."
          className="min-h-16 resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!body.trim() || submitting}>
            {submitting ? "Posting…" : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
