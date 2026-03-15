import { Suspense } from "react";

import { Link } from "@/components/ui/Link";

async function ErrorContent({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams;

  return params?.error ? (
    <p
      role="alert"
      aria-live="polite"
      className="rounded-md border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
    >
      エラーコード: {params.error}
    </p>
  ) : (
    <p role="alert" aria-live="polite" className="text-sm text-zinc-300">
      不明な認証エラーが発生しました。
    </p>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/95 p-6 shadow-xl shadow-zinc-950/40 sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              NUTFES BINGO ADMIN
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
              認証エラーが発生しました
            </h1>
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </div>
          <div className="mt-7 flex flex-wrap gap-4 text-sm">
            <Link href="/auth/login" variant="secondary" className="underline-offset-4">
              ログイン画面へ戻る
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
