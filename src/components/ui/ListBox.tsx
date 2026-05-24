"use client";
import { Check } from "lucide-react";
import {
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  composeRenderProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";

const dropdownItemStyles = tv({
  base: "group flex items-center gap-4 cursor-default select-none py-2 pl-3 pr-3 selected:pr-1 rounded-lg outline outline-0 text-sm forced-color-adjust-none no-underline [&[href]]:cursor-pointer [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      false: "text-neutral-900 dark:text-neutral-100",
      true: "text-neutral-300 dark:text-neutral-600 forced-colors:text-[GrayText]",
    },
    isPressed: {
      true: "bg-neutral-100 dark:bg-neutral-800",
    },
    isFocused: {
      true: "bg-blue-600 dark:bg-blue-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
  compoundVariants: [
    {
      isFocused: false,
      isOpen: true,
      className: "bg-neutral-100 dark:bg-neutral-700/60",
    },
  ],
});

export function DropdownItem(props: ListBoxItemProps) {
  const textValue =
    props.textValue || (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaListBoxItem {...props} textValue={textValue} className={dropdownItemStyles}>
      {composeRenderProps(props.children, (children, { isSelected }) => (
        <>
          <span className="flex items-center flex-1 gap-2 font-normal truncate group-selected:font-semibold">
            {children}
          </span>
          <span className="flex items-center w-5">
            {isSelected && <Check className="size-4" />}
          </span>
        </>
      ))}
    </AriaListBoxItem>
  );
}
