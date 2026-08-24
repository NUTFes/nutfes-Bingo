"use client";
import {
  composeRenderProps,
  Button as RACButton,
  ButtonProps as RACButtonProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import { focusRing } from "@/utils/react-aria-utils";

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: "primary" | "secondary" | "destructive" | "quiet";
}

let button = tv({
  extend: focusRing,
  base: "relative inline-flex h-9 cursor-pointer items-center justify-center gap-2 box-border rounded-lg border border-white/10 px-3.5 py-0 font-sans text-center text-sm transition-colors [-webkit-tap-highlight-color:transparent] [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:w-8 [&:has(>svg:only-child)]:px-0",
  variants: {
    variant: {
      primary: "bg-blue-600 text-white hover:bg-blue-500 pressed:bg-blue-700",
      secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 pressed:bg-neutral-600",
      destructive: "bg-red-700 text-white hover:bg-red-600 pressed:bg-red-800",
      quiet:
        "border-transparent bg-transparent text-neutral-200 hover:bg-neutral-800 pressed:bg-neutral-700",
    },
    isDisabled: {
      true: "cursor-not-allowed border-transparent bg-neutral-900 text-neutral-600 forced-colors:text-[GrayText]",
    },
    isPending: {
      true: "text-transparent",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
  compoundVariants: [
    {
      variant: "quiet",
      isDisabled: true,
      class: "bg-transparent",
    },
  ],
});

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({ ...renderProps, variant: props.variant, className }),
      )}
    >
      {composeRenderProps(props.children, (children, { isPending }) => (
        <>
          {children}
          {isPending && (
            <span aria-hidden className="flex absolute inset-0 justify-center items-center">
              <svg
                className="size-4 text-white animate-spin"
                viewBox="0 0 24 24"
                stroke={
                  props.variant === "secondary" || props.variant === "quiet"
                    ? "light-dark(black, white)"
                    : "white"
                }
              >
                <circle cx="12" cy="12" r="10" strokeWidth="4" fill="none" className="opacity-25" />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  pathLength="100"
                  strokeDasharray="60 140"
                  strokeDashoffset="0"
                />
              </svg>
            </span>
          )}
        </>
      ))}
    </RACButton>
  );
}
