"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { type AuthActionState, type ForgotPasswordActionState } from "./types";
import { createClient } from "@/shared/data/supabase/server";

function toStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeRedirectTo(redirectTo: string | null | undefined, fallback = "/admin") {
  if (!redirectTo) {
    return fallback;
  }

  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : fallback;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (host) {
    const protocol =
      headerStore.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "development" ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function login(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = toStringValue(formData.get("email"));
  const password = toStringValue(formData.get("password"));
  const redirectTo = sanitizeRedirectTo(toStringValue(formData.get("redirectTo")), "/admin");

  if (!email || !password) {
    return { error: "ログインに失敗しました" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signUp(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = toStringValue(formData.get("email"));
  const password = toStringValue(formData.get("password"));
  const repeatPassword = toStringValue(formData.get("repeatPassword"));

  if (password !== repeatPassword) {
    return { error: "パスワードが一致しません" };
  }

  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (session) {
    redirect("/admin");
  }

  return {
    error:
      "サインアップ後にセッションが作成されませんでした。Supabase Auth の Confirm email を無効化してください。",
  };
}

export async function forgotPassword(
  _: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const email = toStringValue(formData.get("email"));
  const supabase = await createClient();
  const origin = await getRequestOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}

export async function updatePassword(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = toStringValue(formData.get("password"));
  if (!password) {
    return { error: "パスワードの更新に失敗しました" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
