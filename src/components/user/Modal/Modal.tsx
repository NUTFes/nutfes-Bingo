"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  children: ReactNode;
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
}

const Modal = ({
  children,
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
}: ModalProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeModal = useCallback(() => {
    setIsOpened(false);
  }, [setIsOpened]);

  useEffect(() => {
    if (!isOpened) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    contentRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canCloseByClickingBackground) {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab" || !contentRef.current) {
        return;
      }

      const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
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
  }, [canCloseByClickingBackground, closeModal, isOpened]);

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <div
            ref={contentRef}
            className={styles.content}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >
            {children}
          </div>
          {canCloseByClickingBackground && (
            <button
              type="button"
              className={styles.background}
              onClick={closeModal}
              aria-label="モーダルを閉じる"
            />
          )}
        </div>
      )}
    </>
  );
};

export default Modal;
