"use client";

import React, { useMemo, useState } from "react";
import { GiPartyPopper } from "react-icons/gi";
import { RxCross1, RxCrossCircled } from "react-icons/rx";

import type { NumberRow } from "@/lib/bingo/types";
import styles from "./JudgementModal.module.css";

type BingoCard = string[][];
type CellPos = { row: number; col: number };
type LineId = `row-${number}` | `col-${number}` | "diag-main" | "diag-anti";
type Line = { id: LineId; cells: CellPos[] };

const BOARD_SIZE = 5;
const CENTER: CellPos = { row: 2, col: 2 };
const FREE = "FREE";
const MAX_BINGO_NUMBER = 99;
const MAX_DIGIT_LENGTH = 2;
const COL_HEADERS = ["B", "I", "N", "G", "O"] as const;
const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消去", "0", "確定"] as const;

const createEmptyBingoCard = (): BingoCard => {
  const card = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ""),
  );
  card[CENTER.row][CENTER.col] = FREE;
  return card;
};

const isCenter = (row: number, col: number) => row === CENTER.row && col === CENTER.col;
const isCellSatisfied = (cell: string, drawnNumbers: number[]) => {
  if (cell === FREE) return true;
  if (cell === "") return false;
  const num = Number.parseInt(cell, 10);
  return !Number.isNaN(num) && drawnNumbers.includes(num);
};
const getRowLineId = (row: number): LineId => `row-${row}`;
const getColLineId = (col: number): LineId => `col-${col}`;
const getDiagMainLineId = (): LineId => "diag-main";
const getDiagAntiLineId = (): LineId => "diag-anti";

const generateAllLines = (size = BOARD_SIZE): Line[] => {
  const lines: Line[] = [];
  for (let r = 0; r < size; r++) {
    lines.push({
      id: getRowLineId(r),
      cells: Array.from({ length: size }, (_, c) => ({ row: r, col: c })),
    });
  }
  for (let c = 0; c < size; c++) {
    lines.push({
      id: getColLineId(c),
      cells: Array.from({ length: size }, (_, r) => ({ row: r, col: c })),
    });
  }
  lines.push({
    id: getDiagMainLineId(),
    cells: Array.from({ length: size }, (_, i) => ({ row: i, col: i })),
  });
  lines.push({
    id: getDiagAntiLineId(),
    cells: Array.from({ length: size }, (_, i) => ({ row: i, col: size - 1 - i })),
  });
  return lines;
};

const ALL_LINES = generateAllLines();
const cloneCard = (card: BingoCard): BingoCard => card.map((row) => row.slice());

interface JudgementModalProps {
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
  bingoNumbers: NumberRow[];
}

const JudgementModal = ({
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
  bingoNumbers,
}: JudgementModalProps) => {
  const [bingoCard, setBingoCard] = useState<BingoCard>(createEmptyBingoCard());
  const [selectedCell, setSelectedCell] = useState<CellPos | null>({ row: 0, col: 0 });
  const [inputValue, setInputValue] = useState("");
  const [hasJudged, setHasJudged] = useState(false);
  const [completedLines, setCompletedLines] = useState<LineId[]>([]);

  const drawnNumbers = useMemo(() => bingoNumbers.map((number) => number.number), [bingoNumbers]);

  const finalizePendingInput = (commitState: boolean): BingoCard => {
    let working = bingoCard;
    if (!hasJudged && inputValue && selectedCell) {
      working = cloneCard(bingoCard);
      working[selectedCell.row][selectedCell.col] = inputValue;
      if (commitState) {
        setBingoCard(working);
        setInputValue("");
      }
    }
    return working;
  };

  const resetAll = () => {
    setBingoCard(createEmptyBingoCard());
    setSelectedCell({ row: 0, col: 0 });
    setInputValue("");
    setCompletedLines([]);
    setHasJudged(false);
  };

  const closeModal = () => {
    setIsOpened(false);
    resetAll();
  };

  const commitValueAt = (pos: CellPos, value: string) => {
    setBingoCard((prev) => {
      const next = cloneCard(prev);
      next[pos.row][pos.col] = value;
      return next;
    });
    setInputValue("");
  };

  const handleJudge = async () => {
    const workingCard = finalizePendingInput(false);
    const done: LineId[] = [];

    for (const line of ALL_LINES) {
      const ok = line.cells.every(({ row, col }) =>
        isCellSatisfied(workingCard[row][col], drawnNumbers),
      );
      if (ok) {
        done.push(line.id);
      }
    }

    setBingoCard(workingCard);
    setCompletedLines(done);
    setHasJudged(true);
    setSelectedCell(null);
    setInputValue("");
  };

  const handleCellClick = (row: number, col: number) => {
    if (hasJudged || isCenter(row, col)) return;

    if (selectedCell && (selectedCell.row !== row || selectedCell.col !== col) && inputValue) {
      commitValueAt(selectedCell, inputValue);
    }

    setSelectedCell({ row, col });
    setInputValue(bingoCard[row][col]);
  };

  const handleDigitClick = (digit: string) => {
    if (hasJudged || !selectedCell) return;
    const next = (inputValue + digit).slice(0, MAX_DIGIT_LENGTH);
    const n = Number.parseInt(next, 10);
    if (Number.isNaN(n) || n < 1 || n > MAX_BINGO_NUMBER) return;
    setInputValue(next);
  };

  const handleDelete = () => {
    if (hasJudged || !selectedCell) return;
    setInputValue("");
    setBingoCard((prev) => {
      const next = cloneCard(prev);
      next[selectedCell.row][selectedCell.col] = "";
      return next;
    });
  };

  const handleCommit = () => {
    if (hasJudged || !selectedCell || !inputValue) return;
    commitValueAt(selectedCell, inputValue);
  };

  const getCellText = (row: number, col: number) => {
    if (!hasJudged && selectedCell?.row === row && selectedCell?.col === col && inputValue) {
      return inputValue;
    }
    return bingoCard[row][col];
  };

  const shouldHighlight = (row: number, col: number) => {
    if (!hasJudged) return false;
    return (
      completedLines.includes(getRowLineId(row)) ||
      completedLines.includes(getColLineId(col)) ||
      (row === col && completedLines.includes(getDiagMainLineId())) ||
      (row + col === BOARD_SIZE - 1 && completedLines.includes(getDiagAntiLineId()))
    );
  };

  if (!isOpened) {
    return null;
  }

  return (
    <div
      className={styles.wrapper}
      onClick={(event) =>
        canCloseByClickingBackground && event.target === event.currentTarget && closeModal()
      }
    >
      <div className={styles.frame} tabIndex={-1}>
        <button type="button" className={styles.btnClose} onClick={closeModal} aria-label="閉じる">
          <RxCrossCircled className={styles.icon} />
        </button>
        <div className={styles.title}>ビンゴ正誤判定</div>
        <div className={styles.contents}>
          <div className={styles.container}>
            <div className={styles.bingoCardContainer}>
              <div className={styles.columnHeaders}>
                {COL_HEADERS.map((header) => (
                  <div key={header}>{header}</div>
                ))}
              </div>
              <div className={styles.bingoGrid}>
                {bingoCard.map((row, rowIndex) => (
                  <div key={rowIndex} className={styles.bingoRow}>
                    {row.map((_, colIndex) => {
                      const classNames = [styles.bingoCell];
                      if (isCenter(rowIndex, colIndex)) classNames.push(styles.freeCell);
                      if (
                        !hasJudged &&
                        selectedCell?.row === rowIndex &&
                        selectedCell?.col === colIndex
                      ) {
                        classNames.push(styles.activeCell);
                        if (inputValue) classNames.push(styles.typingCell);
                      }
                      if (shouldHighlight(rowIndex, colIndex))
                        classNames.push(styles.bingoHighlight);

                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={classNames.join(" ")}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleCellClick(rowIndex, colIndex);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`行${rowIndex + 1} 列${COL_HEADERS[colIndex]} ${getCellText(rowIndex, colIndex) || "空"}`}
                        >
                          {getCellText(rowIndex, colIndex)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {!hasJudged ? (
              <div className={styles.controlsContainer}>
                <div
                  className={`${styles.currentInputDisplay} ${selectedCell ? "" : styles.empty}`}
                >
                  {selectedCell ? "数字を入力してください" : "セルをタップして数字を入力"}
                </div>
                <div className={styles.numpad}>
                  {KEYPAD.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === "消去") handleDelete();
                        else if (label === "確定") handleCommit();
                        else handleDigitClick(label);
                      }}
                      className={`${styles.button} ${label === "消去" || label === "確定" ? styles.functionButton : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className={styles.actionButtonsContainer}>
                  <button type="button" onClick={handleJudge} className={styles.submitButton}>
                    ビンゴ判定
                  </button>
                  <button type="button" onClick={resetAll} className={styles.resetButton}>
                    リセット
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.resultContainer}>
                <div className={styles.resultDisplay}>
                  {completedLines.length > 0 ? (
                    <div className={styles.bingoResult}>
                      <GiPartyPopper className={styles.resultIcon} /> BINGO！
                    </div>
                  ) : (
                    <div className={styles.noWinResult}>
                      <RxCross1 className={styles.resultIcon} />
                      ビンゴはありません
                    </div>
                  )}
                </div>
                <div className={styles.actionButtonsContainer}>
                  <button
                    type="button"
                    onClick={resetAll}
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
  );
};

export default JudgementModal;
