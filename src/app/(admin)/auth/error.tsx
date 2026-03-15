"use client";

import { useEffect } from "react";

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
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            NUTFES BINGO ADMIN
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            認証処理でエラーが発生しました
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            通信状況を確認してから、もう一度お試しください。
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            再試行
          </button>
        </div>
      </section>
    </main>
  );
}
