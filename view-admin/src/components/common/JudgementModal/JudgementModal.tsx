import React, { useState } from "react";
import styles from "./JudgementModal.module.css";
import { RxCrossCircled } from "react-icons/rx";

interface ModalProps {
  isOpened: boolean;
  isIncluded: boolean;
  canCloseByClickingBackground?: boolean;
  setisOpened: (isOpened: boolean) => void;
  setIsIncluded: (included: boolean) => void;
  setInputNumbers: (numbers: number[]) => void;
  checkInclusion: () => void;
}

const Modal = ({
  isOpened,
  isIncluded,
  canCloseByClickingBackground = true,
  setisOpened,
  setIsIncluded,
  setInputNumbers,
  checkInclusion,
}: ModalProps) => {
  const [inputValues, setInputValues] = useState<number[]>([0, 0, 0, 0, 0]);

  const handleInputChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseInt(event.target.value);
    const newInputValues = [...inputValues];
    newInputValues[index] = newValue;
    setInputValues(newInputValues);
  };

  const handleJugement = () => {
    setTimeout(function(){
      setInputNumbers(inputValues);
      checkInclusion();
    }, 500);

  };

  const closeModal = () => {
    setisOpened(false);
    setIsIncluded(false);
  };

  const resetInputs = () => {
    setIsIncluded(false);
    setInputValues([100, 100, 100, 100, 100]);
    resetInputElements();
  };

  const resetInputElements = () => {
    const inputElements = document.getElementsByClassName(styles.inputNum);
    const inputElementArray = Array.from(inputElements) as HTMLInputElement[];
    for (let i = 0; i < inputElementArray.length; i++) {
      inputElementArray[i].value = "";
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
            <div className={styles.title}>ビンゴ正誤判定</div>
            <div className={styles.contents}>
              <div className={styles.inputForm}>
                <input
                  type="number"
                  className={styles.inputNum}
                  onChange={(e) => handleInputChange(0, e)}
                />
                <input
                  type="number"
                  className={styles.inputNum}
                  onChange={(e) => handleInputChange(1, e)}
                />
                <input
                  type="number"
                  className={styles.inputNum}
                  onChange={(e) => handleInputChange(2, e)}
                />
                <input
                  type="number"
                  className={styles.inputNum}
                  onChange={(e) => handleInputChange(3, e)}
                />
                <input
                  type="number"
                  className={styles.inputNum}
                  onChange={(e) => handleInputChange(4, e)}
                />
              </div>
              <div className={styles.explanation}>
                <p>5つの番号を入力してください</p>
                <p>FREEマスの場合は0を入力してください</p>
              </div>
              <div className={styles.judgementContents}>
                <button
                  type="submit"
                  className={styles.jugementButton}
                  onClick={handleJugement}
                >
                  正誤判定
                </button>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={resetInputs}
                >
                  リセット
                </button>
                {isIncluded ? (
                  <div className={styles.jugementResults}>
                    <p>BINGO</p>
                  </div>
                ) : (
                  <div className={styles.jugementResults}>
                    <p>NotYet!</p>
                  </div>
                )}
              </div>
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

export default Modal;
