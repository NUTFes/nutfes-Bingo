"use client";

import { useActionState } from "react";

import { INITIAL_FORGOT_PASSWORD_ACTION_STATE } from "@/app/auth/action-state";
import { forgotPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Link } from "@/components/ui/Link";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [state, formAction, isPending] = useActionState(
    forgotPassword,
    INITIAL_FORGOT_PASSWORD_ACTION_STATE,
  );

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      <div className="rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-xl backdrop-blur">
        <div className="space-y-2 border-b border-border/60 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Auth
          </p>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            {state.success ? "メールを確認してください" : "パスワード再設定"}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {state.success
              ? "パスワード再設定用の案内を送信しました。"
              : "メールアドレスを入力すると、再設定用リンクを送信します。"}
          </p>
        </div>
        <div className="p-6 sm:p-7">
          {state.success ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                メールアドレスとパスワードで登録されている場合、再設定用のメールが届きます。
              </p>
              <Link href="/auth/login" variant="secondary" className="text-sm underline-offset-4">
                ログイン画面へ戻る
              </Link>
            </div>
          ) : (
            <Form action={formAction} className="gap-5">
              <TextField
                name="email"
                type="email"
                label="メールアドレス"
                placeholder="admin@example.com"
                isRequired
              />
              {state.error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
              )}
              <Button type="submit" className="h-10 w-full" isDisabled={isPending}>
                {isPending ? "送信中..." : "再設定メールを送信"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                ログイン画面へ戻る場合は{" "}
                <Link href="/auth/login" variant="secondary" className="underline-offset-4">
                  こちら
                </Link>
              </div>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
