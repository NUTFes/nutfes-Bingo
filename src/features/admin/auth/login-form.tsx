"use client";

import { SyntheticEvent, useReducer } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";

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
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/95 text-zinc-100 shadow-xl shadow-zinc-950/40">
        <div className="space-y-3 border-b border-zinc-800/90 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            NUTFES BINGO ADMIN
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[1.7rem]">
            管理者ログイン
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">
            登録済みのメールアドレスとパスワードを入力して、管理画面へアクセスします。
          </p>
        </div>
        <div className="p-6 sm:p-7">
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
            <p
              role="alert"
              aria-live="polite"
              className={
                state.errorMessage
                  ? "rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200"
                  : "min-h-6 text-sm leading-6 text-transparent"
              }
            >
              {state.errorMessage ?? "\u00a0"}
            </p>
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
        </div>
      </div>
    </div>
  );
}
