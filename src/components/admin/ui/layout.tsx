import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const AdminPageShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black pb-8 text-zinc-100 sm:pb-10",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const AdminPageContent = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
  );
};
