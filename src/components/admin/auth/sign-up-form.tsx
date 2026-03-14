"use client";

import { useActionState } from "react";

import { INITIAL_AUTH_ACTION_STATE } from "@/app/auth/action-state";
import { signUp } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [state, formAction, isPending] = useActionState(signUp, INITIAL_AUTH_ACTION_STATE);

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      <div className="rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-xl backdrop-blur">
        <div className="space-y-2 border-b border-border/60 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Auth
          </p>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            管理者アカウント登録
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Supabase Auth に管理者アカウントを作成します。
          </p>
        </div>
        <div className="p-6 sm:p-7">
          <Form action={formAction} className="gap-5">
            <TextField
              name="email"
              type="email"
              label="メールアドレス"
              placeholder="admin@example.com"
              isRequired
            />
            <TextField name="password" type="password" label="パスワード" isRequired />
            <TextField
              name="repeatPassword"
              type="password"
              label="パスワード（確認）"
              isRequired
            />
            {state.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            <Button type="submit" className="h-10 w-full" isDisabled={isPending}>
              {isPending ? "登録中..." : "新規登録"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              すでにアカウントをお持ちの場合は{" "}
              <Link href="/auth/login" variant="secondary" className="underline-offset-4">
                ログイン
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
