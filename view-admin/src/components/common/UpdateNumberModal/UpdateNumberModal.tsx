import React, { useState } from "react";
import styles from "./UpdateNumberModal.module.css";
import { RxCrossCircled } from "react-icons/rx";
import { useMutation } from "@apollo/client";
import { UpdateOneNumberDocument } from "@/type/graphql";
import type {
  UpdateOneNumberMutation,
  UpdateOneNumberMutationVariables,
} from "@/type/graphql";

interface UpdateNumberModalProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
  canCloseByClickingBackground?: boolean;
  id?: number;
}

const UpdateNumberModal = ({
  isOpened,
  setIsOpened,
  canCloseByClickingBackground = true,
  id,
}: UpdateNumberModalProps) => {
  const [number, setNumber] = useState<number>(0);
  const [updateNumber] = useMutation<
    UpdateOneNumberMutation,
    UpdateOneNumberMutationVariables
  >(UpdateOneNumberDocument);

  const closeModal = () => {
    setIsOpened(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNumber(Number(event.target.value));
  };

  const handleSubmit = (id: number) => {
    if (id !== null) {
      updateNumber({ variables: { id: id, number: number } });
      closeModal();
    }
  };

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper}>
          <div className={styles.frame}>
            <button className={styles.btnClose} onClick={closeModal}>
              <RxCrossCircled className={styles.icon} />
            </button>
            <div className={styles.title}>番号の修正</div>
            <div className={styles.contents}>
              <input
                onChange={handleInputChange}
                className={styles.input}
              ></input>
              <button
                onClick={() => {
                  if (id != undefined) handleSubmit(id);
                }}
                className={styles.submitButton}
              >
                修正
              </button>
            </div>
          </div>
          {canCloseByClickingBackground && (
            <div className={styles.background} onClick={closeModal} />
          )}
        </div>
      )}
    </>
  );
};
export default UpdateNumberModal;
