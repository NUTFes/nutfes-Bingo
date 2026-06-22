"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { login, type AuthActionState } from "./actions";
import { AuthFormCard, AuthFormError } from "./components/AuthFormCard";

const initialState: AuthActionState = {
  errorMessage: null,
};

export function LoginForm({
  redirectTo,
  canSignUp = false,
}: {
  redirectTo?: string;
  canSignUp?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(login.bind(null, redirectTo), initialState);

  return (
    <AuthFormCard
      title="管理者ログイン"
      description="登録済みのメールアドレスとパスワードを入力して、管理画面へアクセスします。"
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
          autoComplete="current-password"
          isRequired
        />
        <AuthFormError errorMessage={state.errorMessage} />
        <Button type="submit" className="h-11 w-full font-medium" isPending={isPending}>
          ログイン
        </Button>
        {canSignUp && (
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
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
