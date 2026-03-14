"use client";

import React, { useMemo, useState } from "react";
import { GiPartyPopper } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";

import type { NumberRow } from "@/lib/bingo/types";
import { cn } from "@/lib/utils";
import { AdminButton, AdminModalShell } from "@/components/admin/ui";

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

  return (
    <AdminModalShell
      isOpen={isOpened}
      onClose={closeModal}
      canCloseByClickingBackground={canCloseByClickingBackground}
      title="ビンゴ正誤判定"
      panelClassName="max-w-5xl"
      bodyClassName="mx-auto w-full max-w-2xl"
    >
      <div className="rounded-3xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg)] p-5 sm:p-7">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-2 grid grid-cols-5 gap-2 text-center text-2xl font-semibold text-[var(--main-color)] sm:gap-2.5 sm:text-3xl">
            {COL_HEADERS.map((header) => (
              <div key={header}>{header}</div>
            ))}
          </div>
          <div className="grid grid-rows-5 gap-2 sm:gap-2.5">
            {bingoCard.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {row.map((_, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      "relative flex aspect-square min-h-12 min-w-12 items-center justify-center rounded-xl border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] text-xl font-semibold text-[var(--admin-card-text)] shadow-sm transition sm:min-h-14 sm:min-w-14 sm:rounded-2xl sm:text-2xl",
                      !isCenter(rowIndex, colIndex) &&
                        "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--main-color)]",
                      isCenter(rowIndex, colIndex) &&
                        "cursor-default border-[var(--main-color)] bg-[var(--main-color)] text-[var(--admin-button-text)]",
                      !hasJudged &&
                        selectedCell?.row === rowIndex &&
                        selectedCell?.col === colIndex &&
                        "border-[var(--main-color)] bg-[color-mix(in_srgb,var(--main-color)_18%,var(--admin-card-bg))] ring-2 ring-[color-mix(in_srgb,var(--main-color)_44%,transparent)]",
                      !hasJudged &&
                        selectedCell?.row === rowIndex &&
                        selectedCell?.col === colIndex &&
                        inputValue &&
                        "text-[var(--main-color)]",
                      shouldHighlight(rowIndex, colIndex) &&
                        "border-[var(--admin-status-highlight)] bg-[var(--admin-status-highlight-bg)] text-[var(--admin-status-highlight-text)] shadow-lg",
                    )}
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
                ))}
              </div>
            ))}
          </div>
        </div>

        {!hasJudged ? (
          <div className="mt-5 flex w-full flex-col items-center">
            <div
              className={cn(
                "mb-5 min-h-12 w-full max-w-sm rounded-2xl px-4 text-center text-xl font-semibold text-[var(--main-color)]",
                !selectedCell && "text-[var(--admin-muted-text)] italic opacity-85",
              )}
            >
              <div className="flex min-h-12 items-center justify-center">
                {selectedCell ? "数字を入力してください" : "セルをタップして数字を入力"}
              </div>
            </div>

            <div className="mb-5 grid w-full max-w-sm grid-cols-3 gap-3">
              {KEYPAD.map((label) => (
                <AdminButton
                  key={label}
                  type="button"
                  variant={label === "消去" || label === "確定" ? "secondary" : "primary"}
                  className="min-h-16 text-2xl"
                  onClick={() => {
                    if (label === "消去") handleDelete();
                    else if (label === "確定") handleCommit();
                    else handleDigitClick(label);
                  }}
                >
                  {label}
                </AdminButton>
              ))}
            </div>

            <div className="flex w-full flex-col items-center gap-3">
              <AdminButton
                type="button"
                onClick={handleJudge}
                size="lg"
                className="w-full max-w-sm"
              >
                ビンゴ判定
              </AdminButton>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={resetAll}
                className="w-full max-w-sm"
              >
                リセット
              </AdminButton>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex w-full flex-col items-center">
            <div className="w-full max-w-sm text-center">
              {completedLines.length > 0 ? (
                <div className="flex items-center justify-center gap-3 rounded-3xl border-2 border-[var(--admin-status-success)] bg-[var(--admin-status-success-bg)] px-4 py-5 text-3xl font-extrabold text-[var(--admin-status-success)] shadow-xl">
                  <GiPartyPopper className="text-3xl sm:text-4xl" /> BINGO！
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 rounded-3xl border-2 border-[var(--admin-status-error)] bg-[var(--admin-status-error-bg)] px-4 py-5 text-2xl font-bold text-[var(--admin-status-error)] shadow-lg">
                  <RxCross1 className="text-3xl sm:text-4xl" />
                  ビンゴはありません
                </div>
              )}
            </div>
            <AdminButton
              type="button"
              variant="secondary"
              onClick={resetAll}
              className="mt-5 w-full max-w-sm"
            >
              もう一度入力する
            </AdminButton>
          </div>
        )}
      </div>
    </AdminModalShell>
  );
};

export default JudgementModal;
