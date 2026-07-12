import { Globe, Link2, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const person = profile as Profile;
  const displayName = person.full_name || person.username;

  const links: { href: string; label: string; icon: typeof Mail }[] = [];
  if (person.contact_email) {
    links.push({
      href: `mailto:${person.contact_email}`,
      label: "Email",
      icon: Mail,
    });
  }
  if (person.linkedin_url) {
    links.push({ href: person.linkedin_url, label: "LinkedIn", icon: Link2 });
  }
  if (person.github_url) {
    links.push({ href: person.github_url, label: "GitHub", icon: Link2 });
  }
  if (person.website_url) {
    links.push({ href: person.website_url, label: "Website", icon: Globe });
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <UserAvatar
            name={displayName}
            avatarUrl={person.avatar_url}
            className="size-20"
          />
          <div className="min-w-0">
            <h1 className="font-heading truncate text-lg font-semibold">
              {displayName}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              @{person.username}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {person.bio ? (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {person.bio}
            </p>
          ) : null}

          {links.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {links.map((link) => {
                const Icon = link.icon;
                const external = !link.href.startsWith("mailto:");
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    <Icon />
                    {link.label}
                  </a>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
