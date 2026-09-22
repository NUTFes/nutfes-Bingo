import { useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
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

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpened) return;

    dialog.showModal();
    // Close before React removes the dialog so the browser can restore focus.
    return () => dialog.close();
  }, [isOpened]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (canCloseByClickingBackground) {
      setIsOpened(false);
    }
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Ignore a queued close event from an earlier open/close cycle.
    if (isOpened && !event.currentTarget.open) {
      setIsOpened(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.wrapper}
      onCancel={handleCancel}
      onClose={handleClose}
      aria-label={ariaLabel}
      aria-modal="true"
    >
      {isOpened && (
        <>
          <div className={styles.content}>{children}</div>
          {canCloseByClickingBackground && (
            <button
              type="button"
              className={styles.background}
              tabIndex={-1}
              onClick={() => setIsOpened(false)}
              aria-label="モーダルを閉じる"
            />
          )}
        </>
      )}
    </dialog>
  );
};

export default Modal;
