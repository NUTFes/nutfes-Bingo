"use client";

import Link from "next/link";
import { useActionState } from "react";

import { INITIAL_FORGOT_PASSWORD_ACTION_STATE } from "@/app/auth/action-state";
import { forgotPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [state, formAction, isPending] = useActionState(
    forgotPassword,
    INITIAL_FORGOT_PASSWORD_ACTION_STATE,
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {state.success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">メールを確認してください</CardTitle>
            <CardDescription>パスワード再設定用の案内を送信しました</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              メールアドレスとパスワードで登録されている場合、再設定用のメールが届きます。
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">パスワード再設定</CardTitle>
            <CardDescription>
              メールアドレスを入力すると、再設定用リンクを送信します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                {state.error && <p className="text-sm text-red-500">{state.error}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "送信中..." : "再設定メールを送信"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                ログイン画面へ戻る場合は{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  こちら
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
