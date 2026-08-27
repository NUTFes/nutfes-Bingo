"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  children: ReactNode;
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
  ariaLabel?: string;
}

const Modal = ({
  children,
  isOpened,
  canCloseByClickingBackground = true,
  ariaLabel = "モーダル",
  setIsOpened,
}: ModalProps) => {
  const contentRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpened) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    contentRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canCloseByClickingBackground) {
        event.preventDefault();
        setIsOpened(false);
        return;
      }

      if (event.key !== "Tab" || !contentRef.current) {
        return;
      }

      const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
        'iframe, a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (!first || !last) {
        event.preventDefault();
        contentRef.current.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [canCloseByClickingBackground, isOpened, setIsOpened]);

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <dialog
            ref={contentRef}
            className={styles.content}
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-modal="true"
            open
          >
            {children}
          </dialog>
          {canCloseByClickingBackground && (
            <button
              type="button"
              className={styles.background}
              onClick={() => setIsOpened(false)}
              aria-label="モーダルを閉じる"
            />
          )}
        </div>
      )}
    </>
  );
};

export default Modal;
