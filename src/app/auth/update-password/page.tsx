import { Link } from "@/components/ui/Link";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_srgb,var(--main-color)_12%,transparent),transparent_50%)] px-4 py-8 sm:px-6 md:py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:grid md:grid-cols-[1.05fr_1fr] md:items-center">
        <div className="space-y-4 text-center md:text-left">
          <p className="text-sm font-medium text-muted-foreground">NUTFES BINGO 管理システム</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            パスワード更新非提供
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            この運用では、アプリ内パスワード更新は提供していません。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            パスワードや権限の調整は、アプリ管理者が Supabase 上で手動実施します。
          </p>
        </div>
        <div className="mx-auto w-full max-w-md md:mx-0 md:justify-self-end">
          <div className="rounded-2xl border border-border/80 bg-card/95 p-6 text-card-foreground shadow-xl backdrop-blur sm:p-7">
            <p className="text-sm leading-relaxed text-muted-foreground">
              管理者アカウントに関する対応が必要な場合は、運用担当へお問い合わせください。
            </p>
            <div className="mt-6">
              <Link href="/auth/login" variant="secondary" className="text-sm underline-offset-4">
                ログイン画面へ戻る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
