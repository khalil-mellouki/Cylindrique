import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * A colored initial "mark" built on shadcn's Avatar. Square by default (for
 * team/project marks); pass shape="circle" for a round avatar. The color is
 * data-driven, so it's applied via inline style.
 */
export function WorkspaceAvatar({
  label,
  color,
  shape = "square",
  className,
  textClassName,
}: {
  label: string;
  color: string;
  shape?: "square" | "circle";
  className?: string;
  textClassName?: string;
}) {
  const square = shape === "square";
  return (
    <Avatar className={cn(square && "rounded-md after:rounded-md", className)}>
      <AvatarFallback
        className={cn(
          "font-semibold text-white",
          square && "rounded-md",
          textClassName,
        )}
        style={{ backgroundColor: color }}
      >
        {label}
      </AvatarFallback>
    </Avatar>
  );
}
