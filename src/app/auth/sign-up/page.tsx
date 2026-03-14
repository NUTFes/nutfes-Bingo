import { SignUpForm } from "@/components/admin/auth/sign-up-form";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_srgb,var(--main-color)_12%,transparent),transparent_50%)] px-4 py-8 sm:px-6 md:py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:grid md:grid-cols-[1.05fr_1fr] md:items-center">
        <div className="space-y-4 text-center md:text-left">
          <p className="text-sm font-medium text-muted-foreground">NUTFES BINGO 管理システム</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            管理者アカウント登録
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            新しい管理者アカウントを作成し、メール確認後に管理操作を開始してください。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            管理権限はアプリ管理者が Supabase 上で手動付与する運用です。
          </p>
        </div>
        <div className="mx-auto w-full max-w-md md:mx-0 md:justify-self-end">
          <SignUpForm />
        </div>
      </section>
    </main>
  );
}
