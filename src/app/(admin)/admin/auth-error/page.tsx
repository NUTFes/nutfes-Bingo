import { Suspense } from "react";

import { Link } from "@/components/ui/Link";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  admin_role_required:
    "このアカウントには管理者権限がありません。管理者アカウントはCLIで作成してください。",
};

async function ErrorContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const errorCode = params?.error;
  const message = errorCode ? AUTH_ERROR_MESSAGES[errorCode] : undefined;

  return errorCode ? (
    <p role="alert" aria-live="polite" className="text-sm text-muted-foreground">
      {message ?? `エラーコード: ${errorCode}`}
    </p>
  ) : (
    <p role="alert" aria-live="polite" className="text-sm text-muted-foreground">
      不明な認証エラーが発生しました。
    </p>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-xl shadow-black/40 sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
            <Link href="/admin/login" variant="secondary" className="underline-offset-4">
              ログイン画面へ戻る
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
