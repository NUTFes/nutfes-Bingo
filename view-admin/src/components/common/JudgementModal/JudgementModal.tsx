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
  const initializeBingoCard = () => {
    const card = Array(5)
      .fill(null)
      .map(() => Array(5).fill(""));
    card[2][2] = "FREE";
    return card;
  };

  const [bingoCard, setBingoCard] = useState<string[][]>(initializeBingoCard());
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [bingoLines, setBingoLines] = useState<number[]>([]);
  const [isJudgementClicked, setIsJudgementClicked] = useState<boolean>(false);
  const [resultClass, setResultClass] = useState<string>("");

  useEffect(() => {
    if (isJudgementClicked) {
      if (bingoLines.length > 0) {
        setResultClass(styles.bingo);
      } else {
        setResultClass(styles.noWin);
      }
    } else {
      setResultClass("");
    }
  }, [isJudgementClicked, bingoLines]);

  const closeModal = () => {
    setIsOpened(false);
    setBingoCard(initializeBingoCard());
    setCurrentRow(0);
    setCurrentCol(0);
    setInputValue("");
    setBingoLines([]);
    setIsJudgementClicked(false);
    setResultClass("");
  };

  const checkBingo = () => {
    const drawnNumbers = bingoNumbers.map((num) => num.number);
    const foundLines: number[] = [];

    for (let row = 0; row < 5; row++) {
      const isComplete = bingoCard[row].every((cell, col) => {
        if (cell === "FREE") return true;
        if (cell === "") return false;
        const num = parseInt(cell);
        return !isNaN(num) && drawnNumbers.includes(num);
      });
      if (isComplete) foundLines.push(row);
    }

    for (let col = 0; col < 5; col++) {
      const isComplete = bingoCard.every((row, rowIndex) => {
        const cell = row[col];
        if (cell === "FREE") return true;
        if (cell === "") return false;
        const num = parseInt(cell);
        return !isNaN(num) && drawnNumbers.includes(num);
      });
      if (isComplete) foundLines.push(col + 5);
    }

    const diagonal1Complete = bingoCard.every((row, index) => {
      const cell = row[index];
      if (cell === "FREE") return true;
      if (cell === "") return false;
      const num = parseInt(cell);
      return !isNaN(num) && drawnNumbers.includes(num);
    });
    if (diagonal1Complete) foundLines.push(10);

    const diagonal2Complete = bingoCard.every((row, index) => {
      const cell = row[4 - index];
      if (cell === "FREE") return true;
      if (cell === "") return false;
      const num = parseInt(cell);
      return !isNaN(num) && drawnNumbers.includes(num);
    });
    if (diagonal2Complete) foundLines.push(11);

    setBingoLines(foundLines);
    setIsJudgementClicked(true);

    setCurrentRow(-1);
    setCurrentCol(-1);
    setInputValue("");
  };

  const handleCellClick = (row: number, col: number) => {
    if (bingoCard[row][col] === "FREE" || isJudgementClicked) return;
    setCurrentRow(row);
    setCurrentCol(col);
    setInputValue(bingoCard[row][col]);
  };

  const handleButtonClick = (value: string) => {
    if (isJudgementClicked) return;

    const newValue = inputValue + value;
    const newValueNum = parseInt(newValue);

    if (newValueNum < 0 || newValueNum > 99) return;

    setInputValue(newValue);

    if (newValue.length === 2) {
      updateBingoCard(newValue);
    }
  };

  const updateBingoCard = (value: string) => {
    const newCard = [...bingoCard];
    newCard[currentRow][currentCol] = value;
    setBingoCard(newCard);
    setInputValue("");

    findNextCell();
  };

  const findNextCell = () => {
    let nextRow = currentRow;
    let nextCol = currentCol + 1;

    if (nextCol >= 5) {
      nextCol = 0;
      nextRow++;
    }

    if (nextRow >= 5) {
      nextRow = 0;
      nextCol = 0;
    }

    if (nextRow === 2 && nextCol === 2) {
      nextCol++;
      if (nextCol >= 5) {
        nextCol = 0;
        nextRow++;
      }
    }

    setCurrentRow(nextRow);
    setCurrentCol(nextCol);
  };

  const handleDelete = () => {
    if (isJudgementClicked) return;

    setInputValue("");
    const newCard = [...bingoCard];
    newCard[currentRow][currentCol] = "";
    setBingoCard(newCard);
  };

  const handleConfirm = () => {
    if (inputValue && !isJudgementClicked) {
      updateBingoCard(inputValue);
    }
  };

  const handleClear = () => {
    setBingoCard(initializeBingoCard());
    setCurrentRow(0);
    setCurrentCol(0);
    setInputValue("");
    setBingoLines([]);
    setIsJudgementClicked(false);
    setResultClass("");
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (canCloseByClickingBackground && e.target === e.currentTarget) {
      closeModal();
    }
  };

  const buttons = isMobile
    ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消去", "0", "確定"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Del", "0", "確定"];

  const getCellClass = (row: number, col: number) => {
    let cellClass = styles.bingoCell;

    if (row === 2 && col === 2) {
      cellClass += ` ${styles.freeCell}`;
    } else if (
      row === currentRow &&
      col === currentCol &&
      !isJudgementClicked &&
      currentRow >= 0 &&
      currentCol >= 0
    ) {
      cellClass += ` ${styles.activeCell}`;
      if (inputValue) {
        cellClass += ` ${styles.inputingCell}`;
      }
    }

    if (bingoLines.length > 0) {
      const isInBingoLine =
        bingoLines.includes(row) ||
        bingoLines.includes(col + 5) ||
        (bingoLines.includes(10) && row === col) ||
        (bingoLines.includes(11) && row === 4 - col);

      if (isInBingoLine) {
        cellClass += ` ${styles.bingoHighlight}`;
      }
    }

    return cellClass;
  };

  const getCellValue = (row: number, col: number) => {
    if (
      row === currentRow &&
      col === currentCol &&
      inputValue &&
      !isJudgementClicked &&
      currentRow >= 0 &&
      currentCol >= 0
    ) {
      return inputValue;
    }
    return bingoCard[row][col];
  };

  const getCurrentInputDescription = () => {
    if (isJudgementClicked || currentRow < 0 || currentCol < 0) return "";

    if (currentRow === 2 && currentCol === 2) {
      return "FREE（中央マス）";
    }

    if (inputValue) {
      return `"${inputValue}" 入力中...`;
    } else if (bingoCard[currentRow][currentCol]) {
      return `"${bingoCard[currentRow][currentCol]}" 編集中`;
    } else {
      return "数字を入力してください";
    }
  };

  const getStatusMessage = () => {
    if (isJudgementClicked) return "";

    const cardFilled = bingoCard.every((row, i) =>
      row.every((cell, j) => cell !== "" || (i === 2 && j === 2)),
    );

    if (cardFilled) {
      return "カード入力完了！判定ボタンを押してください";
    } else {
      return "ビンゴカードの数字を入力してください";
    }
  };

  return (
    <>
      {isOpened && (
        <div className={styles.wrapper} onClick={handleBackgroundClick}>
          <div className={styles.frame}>
            <button
              className={styles.btnClose}
              onClick={closeModal}
              aria-label="閉じる"
            >
              <RxCrossCircled className={styles.icon} />
            </button>
            <div className={styles.title}>ビンゴ正誤判定</div>
            <div className={styles.contents}>
              <div className={styles.container}>
                <div className={styles.statusBar}>{getStatusMessage()}</div>

                <div className={styles.bingoCardContainer}>
                  <div className={styles.columnHeaders}>
                    <div>B</div>
                    <div>I</div>
                    <div>N</div>
                    <div>G</div>
                    <div>O</div>
                  </div>
                  <div className={styles.bingoGrid}>
                    {bingoCard.map((row, rowIndex) => (
                      <div key={rowIndex} className={styles.bingoRow}>
                        {row.map((cell, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={getCellClass(rowIndex, colIndex)}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                          >
                            {getCellValue(rowIndex, colIndex)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {!isJudgementClicked ? (
                  <div className={styles.controlsContainer}>
                    <div
                      className={`${styles.currentInputDisplay} ${!getCurrentInputDescription() ? styles.empty : ""}`}
                    >
                      {getCurrentInputDescription() ||
                        "セルをタップして数字を入力"}
                    </div>

                    <div className={styles.numpad}>
                      {buttons.map((btn, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (btn === "Del" || btn === "消去") handleDelete();
                            else if (btn === "確定") handleConfirm();
                            else handleButtonClick(btn);
                          }}
                          className={`${styles.button} ${
                            btn === "Del" || btn === "消去" || btn === "確定"
                              ? styles.functionButton
                              : ""
                          }`}
                        >
                          {btn}
                        </button>
                      ))}
                    </div>

                    <div className={styles.actionButtonsContainer}>
                      <button
                        onClick={checkBingo}
                        className={styles.submitButton}
                      >
                        ビンゴ判定
                      </button>
                      <button
                        onClick={handleClear}
                        className={styles.resetButton}
                      >
                        リセット
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.resultContainer}>
                    <div className={styles.resultDisplay}>
                      {bingoLines.length > 0 ? (
                        <div className={styles.bingoResult}>
                          <span className={styles.resultIcon}>🎉</span> BINGO！
                        </div>
                      ) : (
                        <div className={styles.noWinResult}>
                          <span className={styles.resultIcon}>❌</span>{" "}
                          ビンゴはありません
                        </div>
                      )}
                    </div>

                    <div className={styles.actionButtonsContainer}>
                      <button
                        onClick={handleClear}
                        className={`${styles.resetButton} ${styles.largeButton}`}
                      >
                        もう一度入力する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JudgementModal;
