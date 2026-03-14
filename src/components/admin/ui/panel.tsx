import type { ReactNode } from "react";

import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";

const AdminSectionTitle = ({
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
        "rounded-3xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface)_96%,transparent)] p-5 shadow-[0_12px_30px_color-mix(in_srgb,var(--admin-overlay)_25%,transparent)] sm:p-6",
        className,
      )}
    >
      {(title || actions || description) && (
        <>
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              {title && <AdminSectionTitle>{title}</AdminSectionTitle>}
              {description ? (
                <p className="m-0 text-sm leading-relaxed text-[var(--admin-muted-text)] sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>
            {actions}
          </header>
          <Separator className="mb-4" />
        </>
      )}
      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </section>
  );
};
