import type { ReactNode } from "react";
import { RxCrossCircled } from "react-icons/rx";

import { cn } from "@/lib/utils";
import { AdminButton } from "@/components/admin/ui/button";

interface AdminModalShellProps {
  isOpen: boolean;
  title: ReactNode;
  onClose: () => void;
  canCloseByClickingBackground?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  panelClassName?: string;
}

export const AdminModalShell = ({
  isOpen,
  title,
  onClose,
  canCloseByClickingBackground = true,
  children,
  footer,
  className,
  bodyClassName,
  panelClassName,
}: AdminModalShellProps) => {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-30 flex items-center justify-center bg-[color-mix(in_srgb,var(--admin-overlay)_88%,transparent)] p-5 sm:p-8",
        className,
      )}
      onClick={(event) => {
        if (canCloseByClickingBackground && event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className={cn(
          "relative max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface)_97%,transparent)] p-5 text-[var(--admin-text)] shadow-2xl sm:p-7",
          panelClassName,
        )}
      >
        <AdminButton
          variant="ghost"
          size="sm"
          rounded="pill"
          aria-label="閉じる"
          className="absolute right-3 top-3 p-1"
          onClick={onClose}
        >
          <RxCrossCircled className="text-2xl" />
        </AdminButton>
        <h3 className="mb-5 pr-10 text-2xl font-semibold leading-tight text-[color-mix(in_srgb,var(--admin-text)_90%,var(--main-color))] sm:text-3xl">
          {title}
        </h3>
        <div className={bodyClassName}>{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
};
