"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { InviteLinkPreview } from "@/lib/types";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [preview, setPreview] = useState<InviteLinkPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await api.links.preview(token);
        if (!cancelled) setPreview(result);
      } catch (e) {
        if (!cancelled) {
          setPreview(null);
          toast.error(e instanceof Error ? e.message : "Failed to load invite");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function join() {
    setJoining(true);
    try {
      await api.links.join(token);
      toast.success("You've joined the team.");
      router.push("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to join team");
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {loading ? (
          <>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </>
        ) : !preview || preview.valid === false ? (
          <>
            <CardHeader>
              <CardTitle>Invite unavailable</CardTitle>
              <CardDescription>
                This invite link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => router.push("/")}>Back to app</Button>
            </CardFooter>
          </>
        ) : preview.already_member ? (
          <>
            <CardHeader>
              <CardTitle>Already a member</CardTitle>
              <CardDescription>
                You&apos;re already a member of {preview.team_name}.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => router.push("/")}>Open workspace</Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Join {preview.team_name}</CardTitle>
              <CardDescription>
                You&apos;ve been invited to join {preview.team_name} as{" "}
                {preview.role}.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                disabled={joining}
              >
                Cancel
              </Button>
              <Button onClick={join} disabled={joining}>
                {joining ? "Joining…" : "Join team"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
