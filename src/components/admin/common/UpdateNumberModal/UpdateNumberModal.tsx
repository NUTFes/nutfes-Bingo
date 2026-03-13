"use client";

import { useEffect, useState } from "react";
import { RxCrossCircled } from "react-icons/rx";

import styles from "./UpdateNumberModal.module.css";

interface UpdateNumberModalProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
  canCloseByClickingBackground?: boolean;
  id?: number;
  initialNumber?: number;
  onSubmit: (params: { id: number; number: number }) => Promise<void> | void;
}

const UpdateNumberModal = ({
  isOpened,
  setIsOpened,
  canCloseByClickingBackground = true,
  id,
  initialNumber = 0,
  onSubmit,
}: UpdateNumberModalProps) => {
  const [number, setNumber] = useState<number>(initialNumber);

  useEffect(() => {
    setNumber(initialNumber);
  }, [initialNumber, isOpened]);

  const closeModal = () => setIsOpened(false);

  const handleSubmit = async () => {
    if (id === undefined || Number.isNaN(number) || number < 1 || number > 99) {
      return;
    }

    await onSubmit({ id, number });
    closeModal();
  };

  if (!isOpened) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <button type="button" className={styles.btnClose} onClick={closeModal}>
          <RxCrossCircled className={styles.icon} />
        </button>
        <div className={styles.title}>番号の修正</div>
        <div className={styles.contents}>
          <input
            type="number"
            min={1}
            max={99}
            value={number}
            onChange={(event) => setNumber(Number(event.target.value))}
            className={styles.input}
          />
          <button type="button" onClick={handleSubmit} className={styles.submitButton}>
            修正
          </button>
        </div>
      </div>
      {canCloseByClickingBackground && <div className={styles.background} onClick={closeModal} />}
    </div>
  );
};

export default UpdateNumberModal;
