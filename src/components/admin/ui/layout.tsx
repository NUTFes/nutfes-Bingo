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
        "admin-theme min-h-screen bg-[var(--admin-bg)] pb-10 text-[var(--admin-text)] sm:pb-12",
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

export const AdminActionBar = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 sm:gap-4", className)}>{children}</div>
  );
};
