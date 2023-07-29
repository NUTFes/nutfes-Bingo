import { type ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  children: ReactNode;
  isOpened: boolean;
  close: () => void;
  canCloseByClickingBackground?: boolean;
}

const Modal = ({
  children,
  isOpened,
  close,
  canCloseByClickingBackground = true,
}: ModalProps) => {
  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <div className={styles.content}>
            <button className={styles.btnClose} onClick={close}>
              ✕
            </button>
            <p className={styles.number}>{children}</p>
          </div>
          {canCloseByClickingBackground && (
            <div className={styles.background} onClick={close} />
          )}
        </div>
      )}
    </>
  );
};

export default Modal;
