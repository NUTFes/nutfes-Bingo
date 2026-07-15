import type { ReactNode } from "react";

interface AuthFormCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthFormCard({ title, description, children }: AuthFormCardProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-card/50 text-foreground shadow-xl shadow-black/40">
        <div className="space-y-3 border-b border-border px-6 pt-8 pb-6 sm:px-10 sm:pt-10 sm:pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            NUTFES BINGO ADMIN
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[1.7rem]">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="px-6 py-6 sm:px-10 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
