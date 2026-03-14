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
      className={cn("m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl", className)}
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
        "rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6",
        className,
      )}
    >
      {(title || actions || description) && (
        <>
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              {title && <AdminSectionTitle>{title}</AdminSectionTitle>}
              {description ? (
                <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                  {description}
                </p>
              ) : null}
            </div>
            {actions}
          </header>
          <Separator className="mb-4 opacity-70" />
        </>
      )}
      <div className={cn("space-y-4 sm:space-y-5", contentClassName)}>{children}</div>
    </section>
  );
};
