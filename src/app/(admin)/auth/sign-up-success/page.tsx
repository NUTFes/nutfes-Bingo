import { Link } from "@/components/ui/Link";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <section className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl sm:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              NUTFES BINGO ADMIN
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              アカウント登録を受け付けました
            </h1>
            <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
              登録したメールアドレス宛に確認メールを送信しました。メール確認後にログインしてください。
            </p>
            <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
              管理権限はアプリ管理者が Supabase
              上で手動付与します。必要な場合は運用担当へ連絡してください。
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/auth/login" variant="secondary" className="underline-offset-4">
              ログイン画面へ戻る
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
