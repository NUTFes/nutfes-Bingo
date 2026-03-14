import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const adminButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--main-color)_34%,transparent)] disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "border-[var(--main-color)] bg-[var(--main-color)] text-[var(--admin-button-text)] shadow-md hover:-translate-y-0.5 hover:brightness-105 hover:shadow-lg",
        secondary:
          "border-[var(--admin-border-subtle)] bg-[var(--admin-surface-strong)] text-[var(--admin-text)] shadow-sm hover:-translate-y-0.5 hover:brightness-105 hover:shadow-md",
        danger:
          "border-[var(--admin-status-error)] bg-[var(--admin-status-error)] text-white shadow-md hover:-translate-y-0.5 hover:brightness-95 hover:shadow-lg",
        ghost:
          "border-transparent bg-transparent text-[var(--main-color)] shadow-none hover:bg-[color-mix(in_srgb,var(--main-color)_16%,transparent)]",
        icon: "size-10 rounded-xl border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-card-bg)_90%,transparent)] text-[var(--main-color)] shadow-none hover:-translate-y-0.5 hover:brightness-95",
      },
      size: {
        sm: "min-h-10 px-4 text-sm",
        md: "min-h-11 px-5 text-base",
        lg: "min-h-12 px-7 text-lg",
        icon: "size-10 p-0",
      },
      rounded: {
        square: "rounded-xl",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      rounded: "square",
    },
  },
);

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof adminButtonVariants> {}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant, size, rounded, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(adminButtonVariants({ variant, size, rounded }), className)}
        {...props}
      />
    );
  },
);

AdminButton.displayName = "AdminButton";

export { adminButtonVariants };
