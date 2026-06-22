"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { signUp, type AuthActionState } from "./actions";
import { AuthFormCard, AuthFormError } from "./components/AuthFormCard";

const initialState: AuthActionState = {
  errorMessage: null,
};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <AuthFormCard
      title="管理者アカウント登録"
      description="メール確認は運用しません。アカウント作成後、運用担当がSupabaseで管理者権限を手動付与します。"
    >
      <Form action={formAction} className="gap-4 sm:gap-5">
        <TextField
          name="email"
          type="email"
          label="メールアドレス"
          placeholder="admin@example.com"
          autoComplete="email"
          isRequired
        />
        <TextField
          name="password"
          type="password"
          label="パスワード"
          autoComplete="new-password"
          isRequired
        />
        <TextField
          name="repeatPassword"
          type="password"
          label="パスワード（確認）"
          autoComplete="new-password"
          isRequired
        />
        <AuthFormError errorMessage={state.errorMessage} />
        <Button type="submit" className="h-11 w-full font-medium" isPending={isPending}>
          新規登録
        </Button>
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          すでにアカウントをお持ちの場合は{" "}
          <Link href="/auth/login" variant="secondary" className="underline-offset-4">
            ログイン
          </Link>
        </p>
      </Form>
    </AuthFormCard>
  );
}
