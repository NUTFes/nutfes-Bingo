import * as React from "react";

import { cn } from "@/lib/utils";

const sharedInputClass =
  "w-full min-h-11 rounded-xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface-strong)_92%,var(--admin-surface))] px-4 py-3 text-base font-semibold text-[var(--admin-text)] placeholder:text-[var(--admin-muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--main-color)_30%,transparent)]";

export const AdminLabel = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => {
  return (
    <label
      className={cn("text-base font-semibold text-[var(--admin-text)]", className)}
      {...props}
    />
  );
};

export const AdminInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return <input ref={ref} className={cn(sharedInputClass, className)} {...props} />;
});
AdminInput.displayName = "AdminInput";

export const AdminSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return <select ref={ref} className={cn(sharedInputClass, className)} {...props} />;
});
AdminSelect.displayName = "AdminSelect";

export const AdminDropzone = ({
  isDragOver,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { isDragOver?: boolean }) => {
  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[var(--admin-border-subtle)] px-6 py-8 text-center text-base font-semibold transition-colors",
        isDragOver
          ? "bg-[color-mix(in_srgb,var(--main-color)_22%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--admin-surface-soft)_74%,transparent)] text-[var(--admin-text)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
