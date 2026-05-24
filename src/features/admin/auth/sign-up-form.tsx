"use client";

import { SyntheticEvent, useReducer } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { AuthFormCard, AuthFormError } from "./components/AuthFormCard";

type State = {
  email: string;
  password: string;
  repeatPassword: string;
  isPending: boolean;
  errorMessage: string | null;
};

type Action =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_REPEAT_PASSWORD"; payload: string }
  | { type: "SET_PENDING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: State = {
  email: "",
  password: "",
  repeatPassword: "",
  isPending: false,
  errorMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_REPEAT_PASSWORD":
      return { ...state, repeatPassword: action.payload };
    case "SET_PENDING":
      return { ...state, isPending: action.payload };
    case "SET_ERROR":
      return { ...state, errorMessage: action.payload };
    default:
      return state;
  }
}

export function SignUpForm() {
  const { push } = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = state.email.trim();

    if (state.password !== state.repeatPassword) {
      dispatch({ type: "SET_ERROR", payload: "パスワードが一致しません" });
      return;
    }

    if (!normalizedEmail || !state.password) {
      dispatch({ type: "SET_ERROR", payload: "アカウント登録に失敗しました" });
      return;
    }

    const supabase = createClient();
    dispatch({ type: "SET_PENDING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: state.password,
      });
      if (error) {
        throw error;
      }
      push("/auth/sign-up-success");
    } catch (error: unknown) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "アカウント登録に失敗しました",
      });
    } finally {
      dispatch({ type: "SET_PENDING", payload: false });
    }
  }

  return (
    <AuthFormCard
      title="管理者アカウント登録"
      description="メール確認は運用しません。アカウント作成後、運用担当がSupabaseで管理者権限を手動付与します。"
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
          autoComplete="new-password"
          value={state.password}
          onChange={(value) => dispatch({ type: "SET_PASSWORD", payload: value })}
          isRequired
        />
        <TextField
          name="repeatPassword"
          type="password"
          label="パスワード（確認）"
          autoComplete="new-password"
          value={state.repeatPassword}
          onChange={(value) => dispatch({ type: "SET_REPEAT_PASSWORD", payload: value })}
          isRequired
        />
        <AuthFormError errorMessage={state.errorMessage} />
        <Button type="submit" className="h-11 w-full font-medium" isPending={state.isPending}>
          新規登録
        </Button>
        <p className="text-center text-sm leading-relaxed text-zinc-300">
          すでにアカウントをお持ちの場合は{" "}
          <Link href="/auth/login" variant="secondary" className="underline-offset-4">
            ログイン
          </Link>
        </p>
      </Form>
    </AuthFormCard>
  );
}
