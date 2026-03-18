"use client";

import { type FormEvent, useState } from "react";
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

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeRedirectTo = sanitizeRedirectTo(redirectTo);
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setErrorMessage("ログインに失敗しました");
      return;
    }

    const supabase = createClient();
    setIsPending(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        throw error;
      }
      router.push(safeRedirectTo);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "ログインに失敗しました");
    } finally {
      setIsPending(false);
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
              value={email}
              onChange={setEmail}
              isRequired
            />
            <TextField
              name="password"
              type="password"
              label="パスワード"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              isRequired
            />
            <p
              role="alert"
              aria-live="polite"
              className={
                errorMessage
                  ? "rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200"
                  : "min-h-6 text-sm leading-6 text-transparent"
              }
            >
              {errorMessage ?? "\u00a0"}
            </p>
            <Button type="submit" className="h-11 w-full font-medium" isPending={isPending}>
              ログイン
            </Button>
            <p className="text-center text-sm leading-relaxed text-zinc-300">
              アカウントをお持ちでない場合は{" "}
              <Link href="/auth/sign-up" variant="secondary" className="underline-offset-4">
                新規登録
              </Link>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}
