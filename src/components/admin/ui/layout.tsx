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
        "admin-theme min-h-screen bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_srgb,var(--main-color)_8%,transparent),transparent_42%),#111111] pb-10 text-[var(--admin-text)] sm:pb-12",
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
