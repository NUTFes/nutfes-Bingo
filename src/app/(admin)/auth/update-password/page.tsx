import { Link } from "@/components/ui/Link";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-md space-y-4">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            NUTFES BINGO ADMIN
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            パスワード更新非提供
          </h1>
          <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
            この運用では、アプリ内パスワード更新は提供していません。
          </p>
          <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
            パスワードや権限の調整は、アプリ管理者が Supabase 上で手動実施します。
          </p>
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-xl sm:p-7">
          <p className="text-sm leading-relaxed text-zinc-300">
            管理者アカウントに関する対応が必要な場合は、運用担当へお問い合わせください。
          </p>
          <div className="mt-6 text-sm">
            <Link href="/auth/login" variant="secondary" className="underline-offset-4">
              ログイン画面へ戻る
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
