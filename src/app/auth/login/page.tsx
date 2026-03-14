import { LoginForm } from "@/components/admin/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

function sanitizeRedirectTo(redirectTo: string | undefined) {
  if (!redirectTo) {
    return undefined;
  }

  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : undefined;
}

export default async function Page({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectTo(params.redirectTo);

  return (
    <main className="flex min-h-svh items-center bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_srgb,var(--main-color)_12%,transparent),transparent_50%)] px-4 py-8 sm:px-6 md:py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:grid md:grid-cols-[1.05fr_1fr] md:items-center">
        <div className="space-y-4 text-center md:text-left">
          <p className="text-sm font-medium text-muted-foreground">NUTFES BINGO 管理システム</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">管理画面へログイン</h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            配信中の番号管理、景品更新、アンケート設定をまとめて操作できます。
          </p>
        </div>
        <div className="mx-auto w-full max-w-md md:mx-0 md:justify-self-end">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </section>
    </main>
  );
}
