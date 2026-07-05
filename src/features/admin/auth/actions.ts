"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  errorMessage: string | null;
};

const genericLoginError = "ログインに失敗しました";

function sanitizeRedirectTo(redirectTo: string | undefined, fallback = "/admin") {
  if (!redirectTo) {
    return fallback;
  }

  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : fallback;
}

function readFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function login(
  redirectTo: string | undefined,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readFormString(formData, "email").trim();
  const password = readFormString(formData, "password");

  if (!email || !password) {
    return { errorMessage: genericLoginError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { errorMessage: error.message || genericLoginError };
  }

  redirect(sanitizeRedirectTo(redirectTo));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
