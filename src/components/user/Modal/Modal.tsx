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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpened && !dialog.open) {
      dialog.showModal();
    } else if (!isOpened && dialog.open) {
      dialog.close();
    }
  }, [isOpened]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: globalThis.MouseEvent) => {
      if (!canCloseByClickingBackground || event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) setIsOpened(false);
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [canCloseByClickingBackground, setIsOpened]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.content}
      aria-label={ariaLabel}
      onCancel={(event) => {
        if (!canCloseByClickingBackground) {
          event.preventDefault();
          return;
        }
        setIsOpened(false);
      }}
      onClose={() => {
        if (isOpened) setIsOpened(false);
      }}
    >
      {children}
    </dialog>
  );
};

export default Modal;
