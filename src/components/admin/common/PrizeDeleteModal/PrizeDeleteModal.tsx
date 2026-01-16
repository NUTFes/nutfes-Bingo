import React from "react";
import styles from "./PrizeDeleteModal.module.css";
import { RxCrossCircled } from "react-icons/rx";

interface Props {
  isOpened: boolean;
  setIsOpened: (v: boolean) => void;
  prizeName?: string;
  onConfirm: () => Promise<void> | void;
  canCloseByClickingBackground?: boolean;
}

const PrizeDeleteModal = ({
  isOpened,
  setIsOpened,
  prizeName,
  onConfirm,
  canCloseByClickingBackground = true,
}: Props) => {
  const close = () => setIsOpened(false);

  const handleConfirm = async () => {
    await onConfirm();
    close();
  };

  if (!isOpened) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <button className={styles.btnClose} onClick={close}>
          <RxCrossCircled />
        </button>
        <div className={styles.title}>景品を削除しますか？</div>
        <div className={styles.desc}>
          次の景品を削除します:{" "}
          <span className={styles.strong}>{prizeName}</span>
        </div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.cancel}`} onClick={close}>
            キャンセル
          </button>
          <button
            className={`${styles.btn} ${styles.danger}`}
            onClick={handleConfirm}
          >
            削除する
          </button>
        </div>
      </div>
      {canCloseByClickingBackground && (
        <div className={styles.background} onClick={close} />
      )}
    </div>
  );
};

export default PrizeDeleteModal;
