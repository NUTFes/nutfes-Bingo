import "server-only";

import { redirect } from "next/navigation";

import type { Tables } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";

type Profile = Tables<"profiles">;

function isMissingSessionError(errorMessage: string) {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("auth session missing") ||
    msg.includes("user from sub claim in jwt does not exist") ||
    msg.includes("invalid refresh token")
  );
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isMissingSessionError(error.message)) {
      return null;
    }

    throw new Error(`認証情報の取得に失敗しました: ${error.message}`);
  }

  return user;
}

async function getCurrentProfile() {
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
    redirect("/auth/error?error=admin_role_required");
  }

  return {
    user,
    profile,
  } satisfies {
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
    profile: Profile;
  };
}
