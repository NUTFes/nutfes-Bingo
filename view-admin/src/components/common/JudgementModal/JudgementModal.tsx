import React, { useState, useEffect } from "react";
import styles from "./JudgementModal.module.css";
import { RxCrossCircled } from "react-icons/rx";
import { SubscribeListNumbersSubscription } from "@/type/graphql";

interface JudgementModalProps {
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
  bingoNumbers: SubscribeListNumbersSubscription["numbers"];
}

const JudgementModal = ({
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
  bingoNumbers,
}: JudgementModalProps) => {
  const [numbers, setNumbers] = useState<string[]>(["", "", "", "", ""]);
  const [isIncluded, setIsIncluded] = useState<boolean>(false);
  const [isJudgementClicked, setIsJudgementClicked] = useState<boolean>(false);
  const [currentBox, setCurrentBox] = useState(0);
  const [resultClass, setResultClass] = useState<string>("");

  useEffect(() => {
    if (isJudgementClicked) {
      if (isIncluded) {
        setNumbers(["B", "I", "N", "G", "O"]);
        setResultClass(styles.bingo);
      } else {
        setNumbers(["N", "o", "W", "i", "n"]);
        setResultClass(styles.noWin);
      }
    } else {
      setResultClass("");
    }
  }, [isJudgementClicked, isIncluded]);

  const closeModal = () => {
    setIsOpened(false);
    setIsIncluded(false);
  };

  const checkInclusion = (inputValues: number[]) => {
    const remainNumbers = inputValues.filter((number) => number !== 0);
    setIsIncluded(
      remainNumbers.every((number) =>
        bingoNumbers.map((num) => num.number).includes(number),
      ),
    );
    setIsJudgementClicked(true);
  };

  const handleButtonClick = (value: string) => {
    if (currentBox < 5) {
      const newNumbers = [...numbers];
      const currentValue = newNumbers[currentBox];
      const prevValue = currentBox > 0 ? newNumbers[currentBox - 1] : null;

      if (currentValue === "" && value === "0") return;

      const newValue = currentValue + value;
      const newValueNum = parseInt(newValue);
      if (newValueNum < 0 || newValueNum > 99 || newValue === prevValue) return;

      newNumbers[currentBox] = newValue;
      setNumbers(newNumbers);
      if (newValueNum > 9) setCurrentBox(Math.min(currentBox + 1, 4));
    }
  };

  const handleClear = () => {
    const clearedNumbers = ["", "", "", "", ""];
    setNumbers(clearedNumbers);
    setCurrentBox(0);
    setIsJudgementClicked(false);
    setIsIncluded(false);
  };

  const handleInputClick = (index: number) => {
    setCurrentBox(index);
  };

  const handleDelete = () => {
    const newNumbers = [...numbers];
    if (newNumbers[currentBox] !== "") {
      newNumbers[currentBox] = newNumbers[currentBox].slice(0, -1);
    } else if (currentBox > 0) {
      setCurrentBox(currentBox - 1);
      newNumbers[currentBox - 1] = newNumbers[currentBox - 1].slice(0, -1);
    }
    setNumbers(newNumbers);
  };

  const handleSubmit = () => {
    if (numbers.every((num) => num !== "")) {
      const numValues = numbers.map((num) => parseInt(num));
      checkInclusion(numValues);
    }
  };

  const handleNext = () => {
    setCurrentBox(Math.min(currentBox + 1, 4));
  };

  const buttons = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "Del",
    "0",
    "次へ",
  ];

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
              <div className={styles.container}>
                <div className={`${styles.inputContainer} ${resultClass}`}>
                  {numbers.map((num, index) => (
                    <input
                      key={index}
                      type="text"
                      value={num}
                      readOnly
                      className={`${styles.input} ${index === currentBox ? styles.active : ""}`}
                      onClick={() => handleInputClick(index)}
                    />
                  ))}
                </div>
                <div className={styles.numpad}>
                  {buttons.map((btn, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (btn === "Del") handleDelete();
                        else if (btn === "次へ") handleNext();
                        else handleButtonClick(btn);
                      }}
                      className={styles.button}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
                <button onClick={handleSubmit} className={styles.submitButton}>
                  正誤判定
                </button>
                <button onClick={handleClear} className={styles.resetButton}>
                  リセット
                </button>
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
export default JudgementModal;
