import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/workspace-utils";
import { cn } from "@/lib/utils";

/** Round avatar for a person: their image if set, otherwise initials. */
export function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn(className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback>{initials(name || "?")}</AvatarFallback>
    </Avatar>
  );
}
