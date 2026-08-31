import { ModalOverlay, ModalOverlayProps, Modal as RACModal } from "react-aria-components";
import { tv } from "tailwind-variants";

const overlayStyles = tv({
  base: "fixed inset-0 isolate z-50 bg-black/75 text-center",
  variants: {
    isEntering: {
      true: "animate-in fade-in duration-150 ease-out motion-reduce:animate-none",
    },
    isExiting: {
      true: "animate-out fade-out duration-150 ease-in motion-reduce:animate-none",
    },
  },
});

const modalStyles = tv({
  base: "w-full max-w-md max-h-[calc(var(--visual-viewport-height)-1rem)] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 font-sans text-left align-middle text-neutral-200 forced-colors:bg-[Canvas]",
  variants: {
    isEntering: {
      true: "animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none",
    },
    isExiting: {
      true: "animate-out fade-out zoom-out-95 duration-150 ease-in motion-reduce:animate-none",
    },
  },
});

export function Modal(props: ModalOverlayProps) {
  return (
    <ModalOverlay {...props} className={overlayStyles}>
      <div className="flex h-(--visual-viewport-height) w-full items-center justify-center box-border p-2 sm:p-4">
        <RACModal {...props} className={modalStyles} />
      </div>
    </ModalOverlay>
  );
}
