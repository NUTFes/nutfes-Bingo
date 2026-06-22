"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAdminSignupEnabled } from "@/lib/supabase/config";

export type AuthActionState = {
  errorMessage: string | null;
};

const genericLoginError = "ログインに失敗しました";
const genericSignUpError = "アカウント登録に失敗しました";

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

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isAdminSignupEnabled()) {
    return { errorMessage: "現在、管理者アカウント登録は無効です" };
  }

  const email = readFormString(formData, "email").trim();
  const password = readFormString(formData, "password");
  const repeatPassword = readFormString(formData, "repeatPassword");

  if (password !== repeatPassword) {
    return { errorMessage: "パスワードが一致しません" };
  }

  if (!email || !password) {
    return { errorMessage: genericSignUpError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { errorMessage: error.message || genericSignUpError };
  }

  redirect("/auth/sign-up-success");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
