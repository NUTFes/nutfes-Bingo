import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const AdminSectionTitle = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <h2
      className={cn(
        "m-0 text-xl font-semibold leading-tight text-[color-mix(in_srgb,var(--admin-text)_90%,var(--main-color))] sm:text-2xl",
        className,
      )}
    >
      {children}
    </h2>
  );
};

interface AdminPanelProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const AdminPanel = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: AdminPanelProps) => {
  return (
    <section
      className={cn(
        "rounded-3xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface)_96%,transparent)] p-5 shadow-lg sm:p-6",
        className,
      )}
    >
      {(title || actions || description) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2">
            {title && <AdminSectionTitle>{title}</AdminSectionTitle>}
            {description ? (
              <p className="m-0 text-base leading-relaxed text-[var(--admin-muted-text)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </section>
  );
};
