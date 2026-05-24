import { Link } from "@/components/ui/Link";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-xl">
        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-xl shadow-black/40 sm:p-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              NUTFES BINGO ADMIN
            </p>
            <p className="text-2xl font-bold tracking-tight">アカウント登録を受け付けました</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              メール確認とパスワードリセットは運用しません。管理権限はアプリ管理者が Supabase
              上で手動付与します。必要な場合は運用担当へ連絡してください。
            </p>
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
