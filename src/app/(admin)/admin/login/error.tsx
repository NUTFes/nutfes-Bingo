"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-border bg-card/95 p-6 text-center shadow-xl shadow-black/40 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            NUTFES BINGO ADMIN
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            認証処理でエラーが発生しました
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            通信状況を確認してから、もう一度お試しください。
          </p>
          <Button type="button" onPress={() => reset()} className="mt-7 min-h-10 px-5">
            再試行
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            もしくは{" "}
            <Link href="/admin/login" variant="secondary" className="underline-offset-4">
              ログイン画面に戻る
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
