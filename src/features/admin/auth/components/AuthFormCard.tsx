import type { ReactNode } from "react";

interface AuthFormCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthFormCard({ title, description, children }: AuthFormCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/95 text-zinc-100 shadow-xl shadow-zinc-950/40">
        <div className="space-y-3 border-b border-zinc-800/90 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            NUTFES BINGO ADMIN
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[1.7rem]">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">
            {description}
          </p>
        </div>
        <div className="p-6 sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthFormError({ errorMessage }: { errorMessage: string | null }) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className={
        errorMessage
          ? "rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200"
          : "min-h-6 text-sm leading-6 text-transparent"
      }
    >
      {errorMessage ?? "\u00a0"}
    </p>
  );
}
