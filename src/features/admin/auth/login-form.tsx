"use client";

import { SyntheticEvent, useReducer } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { AuthFormCard, AuthFormError } from "./components/AuthFormCard";

function sanitizeRedirectTo(redirectTo: string | undefined, fallback = "/admin") {
  if (!redirectTo) {
    return fallback;
  }

  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : fallback;
}

type State = {
  email: string;
  password: string;
  isPending: boolean;
  errorMessage: string | null;
};

type Action =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_PENDING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: State = {
  email: "",
  password: "",
  isPending: false,
  errorMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_PENDING":
      return { ...state, isPending: action.payload };
    case "SET_ERROR":
      return { ...state, errorMessage: action.payload };
    default:
      return state;
  }
}

export function LoginForm({
  redirectTo,
  canSignUp = false,
}: {
  redirectTo?: string;
  canSignUp?: boolean;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeRedirectTo = sanitizeRedirectTo(redirectTo);
    const normalizedEmail = state.email.trim();

    if (!normalizedEmail || !state.password) {
      dispatch({ type: "SET_ERROR", payload: "ログインに失敗しました" });
      return;
    }

    const supabase = createClient();
    dispatch({ type: "SET_PENDING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: state.password,
      });
      if (error) {
        throw error;
      }
      router.push(safeRedirectTo);
    } catch (error: unknown) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "ログインに失敗しました",
      });
    } finally {
      dispatch({ type: "SET_PENDING", payload: false });
    }
  }

  return (
    <AuthFormCard
      title="管理者ログイン"
      description="登録済みのメールアドレスとパスワードを入力して、管理画面へアクセスします。"
    >
      <Form onSubmit={handleSubmit} className="gap-4 sm:gap-5">
        <TextField
          name="email"
          type="email"
          label="メールアドレス"
          placeholder="admin@example.com"
          autoComplete="email"
          value={state.email}
          onChange={(value) => dispatch({ type: "SET_EMAIL", payload: value })}
          isRequired
        />
        <TextField
          name="password"
          type="password"
          label="パスワード"
          autoComplete="current-password"
          value={state.password}
          onChange={(value) => dispatch({ type: "SET_PASSWORD", payload: value })}
          isRequired
        />
        <AuthFormError errorMessage={state.errorMessage} />
        <Button type="submit" className="h-11 w-full font-medium" isPending={state.isPending}>
          ログイン
        </Button>
        {canSignUp && (
          <p className="text-center text-sm leading-relaxed text-zinc-300">
            アカウントをお持ちでない場合は{" "}
            <Link href="/auth/sign-up" variant="secondary" className="underline-offset-4">
              新規登録
            </Link>
          </p>
        )}
      </Form>
    </AuthFormCard>
  );
}
