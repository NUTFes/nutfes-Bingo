import { type ReactNode } from "react";
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
  const closeModal = () => {
    setIsOpened(false);
  };

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <div className={styles.content}>{children}</div>
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
