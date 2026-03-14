import { Suspense } from "react";

import { Link } from "@/components/ui/Link";

async function ErrorContent({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams;

  return params?.error ? (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Code error: {params.error}
    </p>
  ) : (
    <p className="text-sm text-muted-foreground">An unspecified error occurred.</p>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  return (
    <main className="min-h-svh bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_srgb,var(--main-color)_12%,transparent),transparent_52%)] px-4 py-10 sm:px-6 md:py-14">
      <section className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Auth Error
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Sorry, something went wrong.</h1>
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
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
