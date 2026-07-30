import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "player";

export type AuthenticatedProfile = {
  id: string;
  nickname: string;
  role: UserRole;
};

export async function requireUser(): Promise<AuthenticatedProfile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/prihlaseni");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/prihlaseni");
  }

  return {
    id: profile.id,
    nickname: profile.nickname,
    role: profile.role as UserRole,
  };
}

export async function requireAdmin(
  redirectTo = "/souteze",
): Promise<AuthenticatedProfile> {
  const profile = await requireUser();

  if (profile.role !== "admin") {
    redirect(redirectTo);
  }

  return profile;
}
