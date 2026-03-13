import { redirect } from "next/navigation";

import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Profile = Tables<"profiles">;

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`認証情報の取得に失敗しました: ${error.message}`);
  }

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
  }

  return data;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/auth/error");
  }

  return {
    user,
    profile,
  } satisfies {
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
    profile: Profile;
  };
}
