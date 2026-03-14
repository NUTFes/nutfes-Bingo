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
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl">
        <div className="space-y-2 border-b border-zinc-800 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Admin Auth
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight">
            管理者アカウント登録
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">
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
              <p className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {state.error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" isDisabled={isPending}>
              {isPending ? "登録中..." : "新規登録"}
            </Button>
            <p className="text-center text-sm text-zinc-300">
              すでにアカウントをお持ちの場合は{" "}
              <Link href="/auth/login" variant="secondary" className="underline-offset-4">
                ログイン
              </Link>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}
