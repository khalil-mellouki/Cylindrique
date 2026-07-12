"use client";

import { createContext, useContext } from "react";

import type { Profile } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string | null;
}

interface UserContextValue {
  user: SessionUser;
  profile: Profile | null;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  user,
  profile,
  children,
}: UserContextValue & { children: React.ReactNode }) {
  return (
    <UserContext.Provider value={{ user, profile }}>
      {children}
    </UserContext.Provider>
  );
}

/** Current signed-in user + their profile (provided by the (app) layout). */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
