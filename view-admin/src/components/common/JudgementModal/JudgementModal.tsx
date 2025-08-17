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
const NO_SELECTION: CellPos = { row: -1, col: -1 } as const;
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

const hasSelection = (pos: CellPos) => pos.row >= 0 && pos.col >= 0;

const isCellSatisfied = (cell: string, drawnNumbers: number[]) => {
  if (cell === FREE) return true;
  if (cell === "") return false;
  const num = parseInt(cell, 10);
  return !Number.isNaN(num) && drawnNumbers.includes(num);
};

// 行, 列, 斜めの全ラインを事前に計算
const generateAllLines = (size = BOARD_SIZE): Line[] => {
  const lines: Line[] = [];

  // 行
  for (let r = 0; r < size; r++) {
    lines.push({
      id: `row-${r}`,
      cells: Array.from({ length: size }, (_, c) => ({ row: r, col: c })),
    });
  }
  // 列
  for (let c = 0; c < size; c++) {
    lines.push({
      id: `col-${c}`,
      cells: Array.from({ length: size }, (_, r) => ({ row: r, col: c })),
    });
  }
  // 斜め
  lines.push({
    id: "diag-main",
    cells: Array.from({ length: size }, (_, i) => ({ row: i, col: i })),
  });
  lines.push({
    id: "diag-anti",
    cells: Array.from({ length: size }, (_, i) => ({
      row: i,
      col: size - 1 - i,
    })),
  });

  return lines;
};

const ALL_LINES = generateAllLines();

const cloneCard = (card: BingoCard): BingoCard => card.map((r) => r.slice());

// 次に編集可能なセル（中央はスキップ）
const getNextEditableCell = (from: CellPos): CellPos => {
  const startIndex = from.row * BOARD_SIZE + from.col;
  for (let step = 1; step <= BOARD_SIZE * BOARD_SIZE; step++) {
    const idx = (startIndex + step) % (BOARD_SIZE * BOARD_SIZE);
    const row = Math.floor(idx / BOARD_SIZE);
    const col = idx % BOARD_SIZE;
    if (!isCenter(row, col)) return { row, col };
  }
  return from;
};

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
  const [selectedCell, setSelectedCell] = useState<CellPos>({ row: 0, col: 0 });
  const [inputValue, setInputValue] = useState("");
  const [hasJudged, setHasJudged] = useState(false);
  const [completedLines, setCompletedLines] = useState<LineId[]>([]);

  // 抽選済みの数字一覧
  const drawnNumbers = useMemo(
    () => bingoNumbers.map((n) => n.number),
    [bingoNumbers],
  );

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

  // セルに値を反映して次セルへ進む
  const commitValueAt = (pos: CellPos, value: string) => {
    if (!hasSelection(pos)) return;
    setBingoCard((prev) => {
      const next = cloneCard(prev);
      next[pos.row][pos.col] = value;
      return next;
    });
    setInputValue("");
    setSelectedCell(getNextEditableCell(pos));
  };

  // ビンゴ判定
  const handleJudge = () => {
    const done: LineId[] = [];
    for (const line of ALL_LINES) {
      const ok = line.cells.every(({ row, col }) =>
        isCellSatisfied(bingoCard[row][col], drawnNumbers),
      );
      if (ok) done.push(line.id);
    }
    setCompletedLines(done);
    setHasJudged(true);
    setSelectedCell(NO_SELECTION);
    setInputValue("");
  };

  const handleCellClick = (row: number, col: number) => {
    if (hasJudged || isCenter(row, col)) return;
    setSelectedCell({ row, col });
    setInputValue(bingoCard[row][col]);
  };

  // 数字ボタン押下（0-9）
  const handleDigitClick = (digit: string) => {
    if (hasJudged || !hasSelection(selectedCell)) return;

    const next = (inputValue + digit).slice(0, 2);
    const n = parseInt(next, 10);
    if (Number.isNaN(n) || n < 0 || n > 99) return;

    setInputValue(next);
    if (next.length === 2) commitValueAt(selectedCell, next);
  };

  // 削除
  const handleDelete = () => {
    if (hasJudged || !hasSelection(selectedCell)) return;
    setInputValue("");
    setBingoCard((prev) => {
      const next = cloneCard(prev);
      next[selectedCell.row][selectedCell.col] = "";
      return next;
    });
  };

  // 確定（1桁でも確定可能にする）
  const handleConfirm = () => {
    if (!hasJudged && inputValue && hasSelection(selectedCell)) {
      commitValueAt(selectedCell, inputValue);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (canCloseByClickingBackground && e.target === e.currentTarget) {
      closeModal();
    }
  };

  // UIヘルパー
  const isSelected = (row: number, col: number) =>
    selectedCell.row === row && selectedCell.col === col;

  const getCellText = (row: number, col: number) => {
    if (!hasJudged && isSelected(row, col) && inputValue) return inputValue;
    return bingoCard[row][col];
  };

  const shouldHighlight = (row: number, col: number) => {
    if (!hasJudged || completedLines.length === 0) return false;
    return (
      completedLines.includes(`row-${row}` as LineId) ||
      completedLines.includes(`col-${col}` as LineId) ||
      (row === col && completedLines.includes("diag-main")) ||
      (row + col === BOARD_SIZE - 1 && completedLines.includes("diag-anti"))
    );
  };

  const getCurrentInputDescription = () => {
    if (hasJudged || !hasSelection(selectedCell)) return "";
    if (isCenter(selectedCell.row, selectedCell.col)) return "FREE（中央マス）";
    if (inputValue) return `"${inputValue}" 入力中...`;
    const existing = bingoCard[selectedCell.row][selectedCell.col];
    if (existing) return `"${existing}" 編集中`;
    return "数字を入力してください";
  };

  const keypad = [
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

  if (!isOpened) return null;

  return (
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
                      if (
                        !hasJudged &&
                        isSelected(r, c) &&
                        hasSelection(selectedCell)
                      ) {
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
                          role="button"
                          aria-label={`セル ${r + 1}-${c + 1}`}
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
                  {keypad.map((label) => (
                    <button
                      key={label}
                      onClick={() => {
                        if (label === "消去") handleDelete();
                        else if (label === "確定") handleConfirm();
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
                  ))}
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
