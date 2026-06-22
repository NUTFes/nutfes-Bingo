export default function Loading() {
  return (
    <main className="flex min-h-svh items-center bg-background px-4 py-6 text-foreground sm:px-6">
      <section className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            NUTFES BINGO ADMIN
          </p>
          <div className="mt-4 space-y-3">
            <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted/80" />
          </div>
        </div>
      </section>
    </main>
  );
}
