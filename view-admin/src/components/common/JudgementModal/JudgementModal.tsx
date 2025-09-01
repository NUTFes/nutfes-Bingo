import React, { useMemo, useState } from "react";
import styles from "./JudgementModal.module.css";
import { RxCrossCircled, RxCross1 } from "react-icons/rx";
import { GiPartyPopper } from "react-icons/gi";

import { SubscribeListNumbersSubscription } from "@/type/graphql";

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

// 5x5のビンゴ盤, 中央はFREE固定
const createEmptyBingoCard = (): BingoCard => {
  const card = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ""),
  );
  card[CENTER.row][CENTER.col] = FREE;
  return card;
};

const isCenter = (row: number, col: number) =>
  row === CENTER.row && col === CENTER.col;

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

// 行, 列, 斜めの全ラインを事前に計算
const generateAllLines = (size = BOARD_SIZE): Line[] => {
  const lines: Line[] = [];

  // 行
  for (let r = 0; r < size; r++) {
    lines.push({
      id: getRowLineId(r),
      cells: Array.from({ length: size }, (_, c) => ({ row: r, col: c })),
    });
  }
  // 列
  for (let c = 0; c < size; c++) {
    lines.push({
      id: getColLineId(c),
      cells: Array.from({ length: size }, (_, r) => ({ row: r, col: c })),
    });
  }
  // 斜め
  lines.push({
    id: getDiagMainLineId(),
    cells: Array.from({ length: size }, (_, i) => ({ row: i, col: i })),
  });
  lines.push({
    id: getDiagAntiLineId(),
    cells: Array.from({ length: size }, (_, i) => ({
      row: i,
      col: size - 1 - i,
    })),
  });

  return lines;
};

const ALL_LINES = generateAllLines();

const cloneCard = (card: BingoCard): BingoCard => card.map((r) => r.slice());

const KEYPAD = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "消去",
  "0",
  "確定",
] as const;

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
  const [bingoCard, setBingoCard] = useState<BingoCard>(createEmptyBingoCard());
  const [selectedCell, setSelectedCell] = useState<CellPos | null>({
    row: 0,
    col: 0,
  });
  const [inputValue, setInputValue] = useState("");
  const [hasJudged, setHasJudged] = useState(false);
  const [completedLines, setCompletedLines] = useState<LineId[]>([]);

  // 抽選済みの数字一覧
  const drawnNumbers = useMemo(
    () => bingoNumbers.map((n) => n.number),
    [bingoNumbers],
  );

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
    finalizePendingInput(true);
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

  // セルに値を反映
  const commitValueAt = (pos: CellPos, value: string) => {
    setBingoCard((prev) => {
      const next = cloneCard(prev);
      next[pos.row][pos.col] = value;
      return next;
    });
    setInputValue("");
  };

  // ビンゴ判定
  const handleJudge = () => {
    const workingCard = finalizePendingInput(false);

    const done: LineId[] = [];
    for (const line of ALL_LINES) {
      const ok = line.cells.every(({ row, col }) =>
        isCellSatisfied(workingCard[row][col], drawnNumbers),
      );
      if (ok) done.push(line.id);
    }
    setBingoCard(workingCard);
    setCompletedLines(done);
    setHasJudged(true);
    setSelectedCell(null);
    setInputValue("");
  };

  const handleCellClick = (row: number, col: number) => {
    if (hasJudged || isCenter(row, col)) return;

    if (
      selectedCell &&
      (selectedCell.row !== row || selectedCell.col !== col) &&
      inputValue
    ) {
      commitValueAt(selectedCell, inputValue);
    }

    setSelectedCell({ row, col });
    setInputValue(bingoCard[row][col]);
  };

  // 数字ボタン押下（0-9）
  const handleDigitClick = (digit: string) => {
    if (hasJudged || !selectedCell) return;

    const next = (inputValue + digit).slice(0, MAX_DIGIT_LENGTH);
    const n = Number.parseInt(next, 10);
    if (Number.isNaN(n) || n < 1 || n > MAX_BINGO_NUMBER) return;

    setInputValue(next);
  };

  // 削除
  const handleDelete = () => {
    if (hasJudged || !selectedCell) return;
    setInputValue("");
    setBingoCard((prev) => {
      const next = cloneCard(prev);
      next[selectedCell.row][selectedCell.col] = "";
      return next;
    });
  };

  // 確定ボタン押下
  const handleCommit = () => {
    if (hasJudged || !selectedCell || !inputValue) return;
    commitValueAt(selectedCell, inputValue);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (canCloseByClickingBackground && e.target === e.currentTarget) {
      closeModal();
    }
  };

  // UIヘルパー
  const isSelected = (row: number, col: number) =>
    selectedCell?.row === row && selectedCell?.col === col;

  const getCellText = (row: number, col: number) => {
    if (!hasJudged && isSelected(row, col) && inputValue) return inputValue;
    return bingoCard[row][col];
  };

  const shouldHighlight = (row: number, col: number) => {
    if (!hasJudged) return false;
    return (
      completedLines.includes(getRowLineId(row)) ||
      completedLines.includes(getColLineId(col)) ||
      (row === col && completedLines.includes(getDiagMainLineId())) ||
      (row + col === BOARD_SIZE - 1 &&
        completedLines.includes(getDiagAntiLineId()))
    );
  };

  // キーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !hasJudged && selectedCell && inputValue) {
      e.preventDefault();
      handleCommit();
    }
  };

  const getCurrentInputDescription = () => {
    if (hasJudged || !selectedCell) return "";
    if (isCenter(selectedCell.row, selectedCell.col)) return "FREE（中央マス）";
    if (inputValue) return `"${inputValue}" 入力中...`;
    const existing = bingoCard[selectedCell.row][selectedCell.col];
    if (existing) return `"${existing}" 編集中`;
    return "数字を入力してください";
  };

  if (!isOpened) return null;

  return (
    <div className={styles.wrapper} onClick={handleBackgroundClick}>
      <div className={styles.frame} onKeyDown={handleKeyDown} tabIndex={-1}>
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
            <div className={styles.bingoCardContainer}>
              <div className={styles.columnHeaders}>
                {COL_HEADERS.map((h) => (
                  <div key={h}>{h}</div>
                ))}
              </div>

              <div className={styles.bingoGrid}>
                {bingoCard.map((row, r) => (
                  <div key={r} className={styles.bingoRow}>
                    {row.map((_, c) => {
                      const classNames = [styles.bingoCell];
                      if (isCenter(r, c)) classNames.push(styles.freeCell);
                      if (!hasJudged && isSelected(r, c) && selectedCell) {
                        classNames.push(styles.activeCell);
                        if (inputValue) classNames.push(styles.typingCell);
                      }
                      if (shouldHighlight(r, c))
                        classNames.push(styles.bingoHighlight);

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={classNames.join(" ")}
                          onClick={() => handleCellClick(r, c)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCellClick(r, c);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`行${r + 1} 列${COL_HEADERS[c]} ${getCellText(r, c) || "空"}`}
                        >
                          {getCellText(r, c)}
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
                  className={`${styles.currentInputDisplay} ${
                    getCurrentInputDescription() ? "" : styles.empty
                  }`}
                >
                  {getCurrentInputDescription() || "セルをタップして数字を入力"}
                </div>

                <div className={styles.numpad}>
                  {KEYPAD.map((label) => {
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          if (label === "消去") handleDelete();
                          else if (label === "確定") handleCommit();
                          else handleDigitClick(label);
                        }}
                        className={`${styles.button} ${
                          label === "消去" || label === "確定"
                            ? styles.functionButton
                            : ""
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.actionButtonsContainer}>
                  <button onClick={handleJudge} className={styles.submitButton}>
                    ビンゴ判定
                  </button>
                  <button onClick={resetAll} className={styles.resetButton}>
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
