"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { api } from "@/lib/api";
import type {
  ProfileSummary,
  TeamInviteLink,
  TeamRole,
} from "@/lib/types";

const ROLE_ITEMS: { value: TeamRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

function personName(person: ProfileSummary) {
  return person.full_name || person.username;
}

export function InviteDialog({
  open,
  onOpenChange,
  teamId,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onInvited: () => void;
}) {
  const [wasOpen, setWasOpen] = useState(false);

  // "By username" state
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // "Invite link" state
  const [linkRole, setLinkRole] = useState<TeamRole>("member");
  const [links, setLinks] = useState<TeamInviteLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  // Reset draft state whenever the dialog transitions to open. Adjusting state
  // during render is React's documented pattern for "reset state on prop change".
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setInviteRole("member");
      setQuery("");
      setResults([]);
      setSearching(false);
      setInvitingId(null);
      setLinkRole("member");
      setLinks([]);
      setCreatingLink(false);
    }
  }

  // Lightly debounced user search keyed on the query.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await api.profiles.search(q);
        setResults(found);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  async function loadLinks() {
    setLoadingLinks(true);
    try {
      const rows = await api.links.listForTeam(teamId);
      setLinks(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load links");
    } finally {
      setLoadingLinks(false);
    }
  }

  // Load existing links once the dialog is open.
  useEffect(() => {
    if (open) loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamId]);

  async function invite(person: ProfileSummary) {
    setInvitingId(person.id);
    try {
      await api.invites.send(teamId, person.id, inviteRole);
      toast.success(`Invited ${personName(person)}`);
      onInvited();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite");
    } finally {
      setInvitingId(null);
    }
  }

  async function createLink() {
    setCreatingLink(true);
    try {
      await api.links.create(teamId, linkRole);
      toast.success("Invite link created");
      await loadLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create link");
    } finally {
      setCreatingLink(false);
    }
  }

  async function revokeLink(id: string) {
    try {
      await api.links.revoke(id);
      toast.success("Link revoked");
      await loadLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke link");
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Invite someone by username or share a join link.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="username" className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="username">By username</TabsTrigger>
            <TabsTrigger value="link">Invite link</TabsTrigger>
          </TabsList>

          <TabsContent value="username" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole((value as TeamRole) ?? "member")}
                items={ROLE_ITEMS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-search">Search users</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-search"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type a username or name…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex min-h-24 flex-col gap-1">
              {searching ? (
                <p className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </p>
              ) : query.trim().length < 2 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </p>
              ) : results.length === 0 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  No users found.
                </p>
              ) : (
                results.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 rounded-lg px-1 py-2"
                  >
                    <UserAvatar
                      name={personName(person)}
                      avatarUrl={person.avatar_url}
                      className="size-9"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {personName(person)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{person.username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={invitingId === person.id}
                      onClick={() => invite(person)}
                    >
                      {invitingId === person.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <UserPlus />
                      )}
                      Invite
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label>Role</Label>
                <Select
                  value={linkRole}
                  onValueChange={(value) => setLinkRole((value as TeamRole) ?? "member")}
                  items={ROLE_ITEMS}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createLink} disabled={creatingLink}>
                {creatingLink ? <Loader2 className="animate-spin" /> : <Link2 />}
                Create link
              </Button>
            </div>

            <div className="flex min-h-24 flex-col gap-2">
              {loadingLinks ? (
                <p className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading links…
                </p>
              ) : links.length === 0 ? (
                <p className="px-1 py-3 text-sm text-muted-foreground">
                  No active links yet. Create one to share.
                </p>
              ) : (
                links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {`${window.location.origin}/join/${link.token}`}
                    </code>
                    <Badge variant="secondary" className="capitalize">
                      {link.role}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="Copy link"
                      onClick={() => copyLink(link.token)}
                    >
                      <Copy />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Revoke link"
                      onClick={() => revokeLink(link.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
