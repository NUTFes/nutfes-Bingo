import React, { useState, useEffect } from "react";
import styles from "./JudgementModal.module.css";
import { RxCrossCircled } from "react-icons/rx";
import { BingoNumber, subscriptionBingoNumber } from "@/utils/api_methods";

interface ModalProps {
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
}

const Modal = ({
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
}: ModalProps) => {
  const [inputValues, setInputValues] = useState<number[]>([
    100, 100, 100, 100, 100,
  ]);
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);
  const [isIncluded, setIsIncluded] = useState<boolean>(false);
  const [isJudgementClicked, setIsJudgementClicked] = useState<boolean>(false);

  const handleInputChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseInt(event.target.value);
    const newInputValues = [...inputValues];
    newInputValues[index] = newValue;
    setInputValues(newInputValues);
  };

  const closeModal = () => {
    setIsOpened(false);
    setIsIncluded(false);
  };

  const resetInputs = () => {
    const inputElements = document.getElementsByClassName(styles.inputNum);
    const inputElementArray = Array.from(inputElements) as HTMLInputElement[];
    for (let i = 0; i < inputElementArray.length; i++) {
      inputElementArray[i].value = "";
    }
    setIsIncluded(false);
    setIsJudgementClicked(false);
  };

  const checkInclusion = () => {
    const remainNumbers = inputValues.filter((number) => number !== 0);
    if (
      remainNumbers.every((number) =>
        bingoNumbers.map((num) => num.data).includes(number)
      )
    ) {
      setIsIncluded(true);
    }
    setIsJudgementClicked(true);
  };

  useEffect(() => {
    async function fetchBingoNumbers() {
      try {
        const response: BingoNumber[] = await subscriptionBingoNumber();
        if (response) {
          setBingoNumbers(response);
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }
    fetchBingoNumbers();
  }, [bingoNumbers]);

  const BingoJudgement = () => (
    <div className={styles.jugementResults}>
      <p>{isIncluded ? "BINGO" : "NotYet!"}</p>
    </div>
  );

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
                  onClick={checkInclusion}
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
                {isJudgementClicked && <BingoJudgement />}
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
