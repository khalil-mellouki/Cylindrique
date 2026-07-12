"use client";

import { useState } from "react";
import { Crown, LogOut, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { api } from "@/lib/api";
import type { TeamMemberWithProfile, TeamRole } from "@/lib/types";

const ROLE_BADGE: Record<TeamRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

const ROLE_ORDER: Record<TeamRole, number> = { owner: 0, admin: 1, member: 2 };

const ROLE_ITEMS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

export function MembersView({
  members,
  myUserId,
  myRole,
  teamId,
  loading,
  onChanged,
  onInvite,
}: {
  members: TeamMemberWithProfile[];
  myUserId: string;
  myRole: TeamRole | null;
  teamId: string;
  loading: boolean;
  onChanged: () => void;
  onInvite: () => void;
}) {
  const canInvite = myRole === "owner" || myRole === "admin";
  const sorted = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Members</h2>
        {canInvite ? (
          <Button size="sm" onClick={onInvite}>
            <UserPlus />
            Invite people
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              myUserId={myUserId}
              myRole={myRole}
              teamId={teamId}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  myUserId,
  myRole,
  teamId,
  onChanged,
}: {
  member: TeamMemberWithProfile;
  myUserId: string;
  myRole: TeamRole | null;
  teamId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const profile = member.profile;
  const name = profile?.full_name || profile?.username || "Unknown user";
  const isSelf = member.user_id === myUserId;

  // Owners can act on any non-owner; admins only on plain members. Never on
  // yourself (you get the "Leave team" action instead).
  const canManage =
    !isSelf &&
    ((myRole === "owner" && member.role !== "owner") ||
      (myRole === "admin" && member.role === "member"));
  const canTransfer = !isSelf && myRole === "owner" && member.role !== "owner";

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex-row items-center gap-4 px-5 py-4">
      <UserAvatar
        name={name}
        avatarUrl={profile?.avatar_url}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          <Badge variant={ROLE_BADGE[member.role]} className="capitalize">
            {member.role}
          </Badge>
        </div>
        {profile?.username ? (
          <p className="truncate text-xs text-muted-foreground">
            @{profile.username}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canManage ? (
          <Select
            value={member.role}
            onValueChange={(value) => {
              if (value && value !== member.role) {
                run(
                  () =>
                    api.members.setRole(
                      teamId,
                      member.user_id,
                      value as TeamRole,
                    ),
                  "Role updated",
                );
              }
            }}
            items={ROLE_ITEMS}
            disabled={busy}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {canTransfer ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" disabled={busy} />}
            >
              <Crown />
              Transfer
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
                <AlertDialogDescription>
                  {name} will become the owner of this team, and you&apos;ll be
                  demoted to admin. This can&apos;t be undone by you.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    run(
                      () => api.members.transfer(teamId, member.user_id),
                      "Ownership transferred",
                    )
                  }
                >
                  Transfer ownership
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {canManage ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  aria-label={`Remove ${name}`}
                />
              }
            >
              <UserMinus />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                <AlertDialogDescription>
                  {name} will lose access to this team. You can invite them back
                  later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() =>
                    run(
                      () => api.members.remove(teamId, member.user_id),
                      "Member removed",
                    )
                  }
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {isSelf ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" disabled={busy} />}
            >
              <LogOut />
              Leave team
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this team?</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;ll lose access to its projects and notes until
                  someone invites you back.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() =>
                    run(() => api.members.leave(teamId), "You left the team")
                  }
                >
                  Leave team
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </Card>
  );
}
