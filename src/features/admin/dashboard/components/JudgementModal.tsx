"use client";

import { useMemo, useState } from "react";
import { GiPartyPopper } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";

import { Dialog } from "@/components/ui/Dialog";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import {
  BOARD_SIZE,
  MAX_BINGO_NUMBER,
  type BingoCard,
  type CellPos,
  type LineId,
  cloneCard,
  createEmptyBingoCard,
  getColLineId,
  getCompletedLines,
  getDiagAntiLineId,
  getDiagMainLineId,
  getRowLineId,
  isCenter,
} from "@/shared/domain/bingo/judgement";
import type { NumberRow } from "@/shared/domain/bingo/types";
import { cn } from "@/shared/utils/utils";

const MAX_DIGIT_LENGTH = 2;
const COL_HEADERS = ["B", "I", "N", "G", "O"] as const;
const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消去", "0", "確定"] as const;

interface JudgementModalProps {
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
  bingoNumbers: NumberRow[];
}

interface JudgementState {
  selectedCell: CellPos | null;
  inputValue: string;
  hasJudged: boolean;
  completedLines: LineId[];
}

const createInitialJudgementState = (): JudgementState => ({
  selectedCell: { row: 0, col: 0 },
  inputValue: "",
  hasJudged: false,
  completedLines: [],
});

const JudgementModal = ({
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
  bingoNumbers,
}: JudgementModalProps) => {
  const [bingoCard, setBingoCard] = useState<BingoCard>(() => createEmptyBingoCard());
  const [judgementState, setJudgementState] = useState<JudgementState>(createInitialJudgementState);
  const { selectedCell, inputValue, hasJudged, completedLines } = judgementState;

  const drawnNumbers = useMemo(() => bingoNumbers.map((number) => number.number), [bingoNumbers]);

  const finalizePendingInput = (commitState: boolean): BingoCard => {
    let working = bingoCard;
    if (!hasJudged && inputValue && selectedCell) {
      working = cloneCard(bingoCard);
      working[selectedCell.row][selectedCell.col] = inputValue;
      if (commitState) {
        setBingoCard(working);
        setJudgementState((prev) => ({ ...prev, inputValue: "" }));
      }
    }
    return working;
  };

  const resetAll = () => {
    setBingoCard(createEmptyBingoCard());
    setJudgementState(createInitialJudgementState());
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
    setJudgementState((prev) => ({ ...prev, inputValue: "" }));
  };

  const handleJudge = async () => {
    const workingCard = finalizePendingInput(false);
    const done = getCompletedLines(workingCard, drawnNumbers);

    setBingoCard(workingCard);
    setJudgementState((prev) => ({
      ...prev,
      completedLines: done,
      hasJudged: true,
      selectedCell: null,
      inputValue: "",
    }));
  };

  const handleCellClick = (row: number, col: number) => {
    if (hasJudged || isCenter(row, col)) return;

    if (selectedCell && (selectedCell.row !== row || selectedCell.col !== col) && inputValue) {
      commitValueAt(selectedCell, inputValue);
    }

    setJudgementState((prev) => ({
      ...prev,
      selectedCell: { row, col },
      inputValue: bingoCard[row][col],
    }));
  };

  const handleDigitClick = (digit: string) => {
    if (hasJudged || !selectedCell) return;
    const next = (inputValue + digit).slice(0, MAX_DIGIT_LENGTH);
    const n = Number.parseInt(next, 10);
    if (Number.isNaN(n) || n < 1 || n > MAX_BINGO_NUMBER) return;
    setJudgementState((prev) => ({ ...prev, inputValue: next }));
  };

  const handleDelete = () => {
    if (hasJudged || !selectedCell) return;
    setJudgementState((prev) => ({ ...prev, inputValue: "" }));
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
    <Modal
      isOpen={isOpened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeModal();
        }
      }}
      isDismissable={canCloseByClickingBackground}
    >
      <Dialog>
        <h3 className="text-xl font-semibold leading-tight text-zinc-100 sm:text-2xl">
          ビンゴ正誤判定
        </h3>
        <Separator className="my-4 opacity-75" />
        <div className="mx-auto w-full max-w-2xl">
          <div>
            <p className="mb-4 text-sm">
              5×5 のカードに数字を入力し、最後に「ビンゴ判定」を押してください。
            </p>
            <div className="mx-auto w-full max-w-lg">
              <div className="mb-2 grid grid-cols-5 gap-2 text-center text-xl font-semibold text-zinc-100 sm:gap-2.5 sm:text-3xl">
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
                          "relative flex aspect-square min-h-12 min-w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-lg font-semibold text-zinc-100 shadow-sm transition sm:min-h-14 sm:min-w-14 sm:rounded-2xl sm:text-2xl",
                          !isCenter(rowIndex, colIndex) &&
                            "cursor-pointer hover:-translate-y-0.5 hover:border-sky-600",
                          isCenter(rowIndex, colIndex) && "cursor-default  text-white",
                          !hasJudged &&
                            selectedCell?.row === rowIndex &&
                            selectedCell?.col === colIndex &&
                            "border-sky-600 ring-2 ring-sky-400/40",
                          !hasJudged &&
                            selectedCell?.row === rowIndex &&
                            selectedCell?.col === colIndex &&
                            inputValue &&
                            "text-zinc-100",
                          shouldHighlight(rowIndex, colIndex) &&
                            "border-indigo-400 bg-indigo-500/20 text-indigo-100 shadow-lg",
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
                <div className="mb-4 grid w-full max-w-sm grid-cols-3 gap-2.5">
                  {KEYPAD.map((label) => (
                    <Button
                      key={label}
                      type="button"
                      variant={label === "消去" || label === "確定" ? "secondary" : "primary"}
                      className="min-h-14 text-xl sm:min-h-16 sm:text-2xl"
                      onPress={() => {
                        if (label === "消去") handleDelete();
                        else if (label === "確定") handleCommit();
                        else handleDigitClick(label);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <div className="grid w-full max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button type="button" variant="primary" onPress={handleJudge} className="w-full">
                    ビンゴ判定
                  </Button>
                  <Button type="button" variant="secondary" onPress={resetAll} className="w-full">
                    リセット
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex w-full flex-col items-center">
                <div className="w-full max-w-sm text-center">
                  {completedLines.length > 0 ? (
                    <div className="flex items-center justify-center gap-3 rounded-3xl border-2 border-emerald-500 bg-emerald-500/20 py-3 text-3xl font-extrabold text-emerald-300 shadow-sm">
                      <GiPartyPopper className="text-3xl sm:text-4xl" /> BINGO！
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 rounded-3xl border-2 border-rose-500 bg-rose-500/20 py-3 text-2xl font-bold text-rose-300 shadow-sm">
                      <RxCross1 className="text-3xl sm:text-4xl" />
                      ビンゴはありません
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onPress={resetAll}
                  className="mt-5 w-full max-w-sm"
                >
                  もう一度入力する
                </Button>
              </div>
            )}
            <div className="mt-4 flex w-full justify-center">
              <Button
                type="button"
                variant="secondary"
                onPress={closeModal}
                className="w-full max-w-sm"
              >
                閉じる
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </Modal>
  );
};

export default JudgementModal;
