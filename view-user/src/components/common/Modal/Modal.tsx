import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

interface ModalProps {
  children: ReactNode;
  buttonText: string;
  canCloseByClickingBackground?: boolean;
}

const Modal = ({
  children,
  buttonText,
  canCloseByClickingBackground = true,
}: ModalProps) => {
  const [isOpened, setIsOpened] = useState(false);

  const open = () => setIsOpened(true);
  const close = () => setIsOpened(false);

  const renderButton = () => {
      return (
        <button
          type="button"
          onClick={open}
          className={styles.btnOpen}
          >
          {buttonText}
        </button>
      );
  };

  const elmModal = (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <button
          className={styles.btnClose}
          onClick={close}
          >✕</button>
        {children}
      </div>
      {canCloseByClickingBackground && (
          <div className={styles.background} onClick={close} />
      )}
    </div>
  );
  return (
    <>
      {renderButton()}
      {isOpened && createPortal(elmModal, document.body)}
    </>
  );
};

export default Modal;
