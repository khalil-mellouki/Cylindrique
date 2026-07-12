"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceAvatar } from "@/components/workspace-avatar";
import { api } from "@/lib/api";
import type { InviteInboxRow } from "@/lib/types";
import { accentFromId, formatRelative, initials } from "@/lib/workspace-utils";

export function InvitesView({
  inbox,
  loading,
  onChanged,
  onJoined,
}: {
  inbox: InviteInboxRow[];
  loading: boolean;
  onChanged: () => void;
  onJoined: (teamId: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [joining, setJoining] = useState(false);

  async function accept(id: string) {
    setBusyId(id);
    try {
      const teamId = await api.invites.accept(id);
      toast.success("Invitation accepted");
      onJoined(teamId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    try {
      await api.invites.decline(id);
      toast.success("Invitation declined");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  function extractToken(value: string) {
    const trimmed = value.trim();
    const marker = "/join/";
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      return trimmed.slice(idx + marker.length).split(/[/?#]/)[0];
    }
    return trimmed;
  }

  async function join() {
    const token = extractToken(linkValue);
    if (!token) return;
    setJoining(true);
    try {
      const teamId = await api.links.join(token);
      toast.success("Joined team");
      setLinkValue("");
      onJoined(teamId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Invitations
        </h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : inbox.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No pending invitations"
            description="Invitations to join a team will show up here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {inbox.map((invite) => {
              const busy = busyId === invite.id;
              return (
                <Card
                  key={invite.id}
                  className="flex-row items-center gap-4 px-5"
                >
                  <WorkspaceAvatar
                    label={initials(invite.team_name)}
                    color={accentFromId(invite.team_id)}
                    className="size-11 rounded-lg text-base after:rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {invite.team_name}
                      </span>
                      <Badge variant="secondary" className="capitalize">
                        {invite.role}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {invite.invited_by_name
                        ? `Invited by ${invite.invited_by_name}`
                        : "Invited"}{" "}
                      · {formatRelative(invite.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => decline(invite.id)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => accept(invite.id)}
                    >
                      Accept
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Join with a link
        </h2>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            join();
          }}
        >
          <Input
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            placeholder="Paste an invite link or code"
          />
          <Button
            type="submit"
            disabled={joining || linkValue.trim().length === 0}
          >
            {joining ? "Joining…" : "Join"}
          </Button>
        </form>
      </section>
    </div>
  );
}
