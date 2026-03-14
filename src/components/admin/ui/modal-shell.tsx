import type { ReactNode } from "react";
import { RxCrossCircled } from "react-icons/rx";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Modal } from "@/components/ui/Modal";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";

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
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      isDismissable={canCloseByClickingBackground}
      className={className}
    >
      <Dialog
        className={cn(
          "relative max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface)_97%,transparent)] p-5 text-[var(--admin-text)] shadow-2xl sm:p-7",
          panelClassName,
        )}
      >
        <Button
          variant="quiet"
          aria-label="閉じる"
          className="absolute right-3 top-3 p-1"
          onPress={onClose}
        >
          <RxCrossCircled className="text-2xl" />
        </Button>
        <h3 className="pr-10 text-2xl font-semibold leading-tight text-[color-mix(in_srgb,var(--admin-text)_90%,var(--main-color))] sm:text-3xl">
          {title}
        </h3>
        <Separator className="my-4" />
        <div className={bodyClassName}>{children}</div>
        {footer ? (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap justify-end gap-3">{footer}</div>
          </>
        ) : null}
      </Dialog>
    </Modal>
  );
};
