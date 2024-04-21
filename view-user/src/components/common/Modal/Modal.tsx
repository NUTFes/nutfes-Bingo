import { type ReactNode } from "react";
import styles from "./Modal.module.css";
import { RxCross1 } from "react-icons/rx";

interface ModalProps {
  children: ReactNode;
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setisOpened: (isOpened: boolean) => void;
}

const Modal = ({
  children,
  isOpened,
  canCloseByClickingBackground = true,
  setisOpened,
}: ModalProps) => {
  const closeModal = () => {
    setisOpened(false);
  };

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <div className={styles.content}>
            <button className={styles.btnClose} onClick={closeModal}>
              <RxCross1 />
            </button>
            {children}
          </div>
          {canCloseByClickingBackground && (
            <div className={styles.background} onClick={closeModal} />
          )}
        </div>
      )}
    </>
  );
};

export default Modal;
