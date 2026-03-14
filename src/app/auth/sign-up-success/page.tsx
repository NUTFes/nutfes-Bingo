import { Link } from "@/components/ui/Link";

export default function Page() {
  return (
    <main className="min-h-svh bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_srgb,var(--main-color)_12%,transparent),transparent_52%)] px-4 py-10 sm:px-6 md:py-14">
      <section className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Setup
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Thank you for signing up!</h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              You&apos;ve successfully signed up. Please check your email to confirm your account
              before signing in.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
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
