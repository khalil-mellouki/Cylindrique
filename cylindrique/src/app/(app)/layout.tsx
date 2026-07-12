import { redirect } from "next/navigation";

import { UserProvider } from "@/components/auth/user-provider";
import { createClient } from "@/utils/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <UserProvider
      user={{ id: user.id, email: user.email ?? null }}
      profile={profile}
    >
      {children}
    </UserProvider>
  );
}
