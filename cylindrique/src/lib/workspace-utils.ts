// Shared types and presentation helpers for the workspace UI.

import type { KeyboardEvent } from "react";

export type View = "dashboard" | "projects" | "notes" | "teams";
export type CreateType = "note" | "project" | "team";

/** Props that make a non-button element behave as an accessible clickable card. */
export function cardActivation(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
  };
}

// Deterministic accent palette. A given id always maps to the same color, so
// team/project marks and note dots stay stable across renders without needing
// a color stored in the database.
const ACCENTS = [
  "#18181b",
  "#2563eb",
  "#0f766e",
  "#7c3aed",
  "#c2410c",
  "#be123c",
  "#16a34a",
  "#0891b2",
];

export function accentFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

/** First letter, or first + last initials for multi-word names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Short relative time ("Just now", "3h ago") falling back to a short date. */
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "";

  const diff = Date.now() - ms;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
