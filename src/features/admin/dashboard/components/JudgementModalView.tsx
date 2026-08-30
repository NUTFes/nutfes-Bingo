"use client";

import { PartyPopper, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Modal } from "@/components/ui/Modal";
import {
  BOARD_SIZE,
  type BingoCard,
  type CellPos,
  type LineId,
  getColLineId,
  getDiagAntiLineId,
  getDiagMainLineId,
  getRowLineId,
  isCenter,
} from "@/types/bingo/judgement";
import { cn } from "@/utils/utils";

const COL_HEADERS = ["B", "I", "N", "G", "O"] as const;
const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "消去", "0", "確定"] as const;

interface JudgementModalViewProps {
  isOpened: boolean;
  canCloseByClickingBackground: boolean;
  bingoCard: BingoCard;
  selectedCell: CellPos | null;
  inputValue: string;
  hasJudged: boolean;
  completedLines: LineId[];
  judgedRevision: number | null;
  error: string | null;
  isJudging: boolean;
  onClose: () => void;
  onCellClick: (row: number, col: number) => void;
  onDigitClick: (digit: string) => void;
  onDelete: () => void;
  onCommit: () => void;
  onJudge: () => void;
  onReset: () => void;
}

export function JudgementModalView({
  isOpened,
  canCloseByClickingBackground,
  bingoCard,
  selectedCell,
  inputValue,
  hasJudged,
  completedLines,
  judgedRevision,
  error,
  isJudging,
  onClose,
  onCellClick,
  onDigitClick,
  onDelete,
  onCommit,
  onJudge,
  onReset,
}: JudgementModalViewProps) {
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

  const selectedCellLabel = selectedCell
    ? `${COL_HEADERS[selectedCell.col]}${selectedCell.row + 1}`
    : null;

  return (
    <Modal
      isOpen={isOpened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      isDismissable={canCloseByClickingBackground}
    >
      <Dialog className="p-4 outline-none sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-neutral-50 sm:text-xl">
              ビンゴ正誤判定
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">
              カードのマスを選び、数字を入力してください。
            </p>
          </div>
          <Button
            type="button"
            variant="quiet"
            onPress={onClose}
            aria-label="正誤判定を閉じる"
            className="h-11 w-11 shrink-0 px-0"
          >
            <span aria-hidden>
              <X className="size-4" />
            </span>
          </Button>
        </div>

        <div className="mx-auto mt-4 w-full max-w-[320px]">
          <div
            aria-hidden
            className="mb-1.5 grid grid-cols-5 gap-1.5 text-center text-sm font-bold text-neutral-400"
          >
            {COL_HEADERS.map((header) => (
              <div key={header}>{header}</div>
            ))}
          </div>

          <div className="grid grid-rows-5 gap-1.5">
            {bingoCard.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-5 gap-1.5">
                {row.map((_, colIndex) => {
                  const center = isCenter(rowIndex, colIndex);
                  const selected =
                    !hasJudged && selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  const highlighted = shouldHighlight(rowIndex, colIndex);

                  return (
                    <button
                      type="button"
                      key={`${rowIndex}-${colIndex}`}
                      disabled={hasJudged || center}
                      aria-pressed={selected || undefined}
                      className={cn(
                        "relative flex aspect-square min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-lg font-semibold text-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
                        !hasJudged &&
                          !center &&
                          "cursor-pointer hover:border-neutral-500 hover:bg-neutral-700 active:bg-neutral-700",
                        center && "cursor-default bg-neutral-700 text-sm text-neutral-300",
                        selected &&
                          "border-blue-400 bg-blue-500/15 text-white ring-2 ring-blue-500/40",
                        highlighted && "border-emerald-400 bg-emerald-500/20 text-emerald-100",
                      )}
                      onClick={() => onCellClick(rowIndex, colIndex)}
                      aria-label={`${COL_HEADERS[colIndex]}${rowIndex + 1} ${center ? "FREE" : getCellText(rowIndex, colIndex) || "空"}`}
                    >
                      {getCellText(rowIndex, colIndex)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {!hasJudged ? (
          <div className="mx-auto mt-4 w-full max-w-[320px]">
            <div className="mb-2 flex min-h-5 items-center justify-between gap-3 text-xs">
              <span className="font-medium text-neutral-300">
                {selectedCellLabel ? `選択中: ${selectedCellLabel}` : "マスを選択してください"}
              </span>
              {inputValue && <span className="text-neutral-400">入力値: {inputValue}</span>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {KEYPAD.map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant={label === "確定" ? "primary" : "secondary"}
                  className="min-h-12 text-lg font-medium"
                  onPress={() => {
                    if (label === "消去") onDelete();
                    else if (label === "確定") onCommit();
                    else onDigitClick(label);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-red-950/60 px-3 py-2.5 text-sm leading-relaxed text-red-200"
              >
                {error}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="primary"
                onPress={onJudge}
                isDisabled={isJudging}
                isPending={isJudging}
                className="min-h-12 flex-1 text-base font-semibold"
              >
                ビンゴ判定
              </Button>
              <Button
                type="button"
                variant="secondary"
                onPress={onReset}
                isDisabled={isJudging}
                className="min-h-12 shrink-0 px-4"
              >
                リセット
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-4 w-full max-w-[320px]">
            {completedLines.length > 0 ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-xl font-bold text-emerald-200"
              >
                <PartyPopper className="size-6" aria-hidden />
                BINGO！
              </div>
            ) : (
              <div
                role="status"
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-3 text-base font-semibold text-neutral-100"
              >
                <X className="size-5 text-neutral-400" aria-hidden />
                ビンゴはありません
              </div>
            )}

            {judgedRevision !== null && (
              <p className="mt-2 text-center text-xs text-neutral-500">
                抽選状態 revision {judgedRevision} で判定
              </p>
            )}

            <Button
              type="button"
              variant="primary"
              onPress={onReset}
              className="mt-3 min-h-12 w-full text-base font-semibold"
            >
              もう一度入力する
            </Button>
          </div>
        )}
      </Dialog>
    </Modal>
  );
}
