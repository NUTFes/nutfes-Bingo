"use client";

import { GiPartyPopper } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Modal } from "@/components/ui/Modal";
import { Separator } from "@/components/ui/Separator";
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
      <Dialog>
        <h2 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
          ビンゴ正誤判定
        </h2>
        <Separator className="my-4 opacity-75" />
        <div className="mx-auto w-full max-w-2xl">
          <div>
            <p className="mb-4 text-sm">
              5×5 のカードに数字を入力し、最後に「ビンゴ判定」を押してください。
            </p>
            <div className="mx-auto w-full max-w-lg">
              <div className="mb-2 grid grid-cols-5 gap-2 text-center text-xl font-semibold text-foreground sm:gap-2.5 sm:text-3xl">
                {COL_HEADERS.map((header) => (
                  <div key={header}>{header}</div>
                ))}
              </div>
              <div className="grid grid-rows-5 gap-2 sm:gap-2.5">
                {bingoCard.map((row, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="grid grid-cols-5 gap-2 sm:gap-2.5">
                    {row.map((_, colIndex) => (
                      <button
                        type="button"
                        key={`${rowIndex}-${colIndex}`}
                        className={cn(
                          "relative flex aspect-square min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-card text-lg font-semibold text-foreground shadow-sm transition sm:min-h-14 sm:min-w-14 sm:rounded-2xl sm:text-2xl",
                          !isCenter(rowIndex, colIndex) &&
                            "cursor-pointer hover:border-primary hover:bg-accent",
                          isCenter(rowIndex, colIndex) &&
                            "cursor-default bg-primary text-primary-foreground",
                          !hasJudged &&
                            selectedCell?.row === rowIndex &&
                            selectedCell?.col === colIndex &&
                            "border-primary ring-2 ring-primary/40",
                          !hasJudged &&
                            selectedCell?.row === rowIndex &&
                            selectedCell?.col === colIndex &&
                            inputValue &&
                            "text-foreground",
                          shouldHighlight(rowIndex, colIndex) &&
                            "border-primary bg-primary/20 text-primary shadow-lg",
                        )}
                        onClick={() => onCellClick(rowIndex, colIndex)}
                        aria-label={`行${rowIndex + 1} 列${COL_HEADERS[colIndex]} ${getCellText(rowIndex, colIndex) || "空"}`}
                      >
                        {getCellText(rowIndex, colIndex)}
                      </button>
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
                      variant={label === "確定" ? "primary" : "secondary"}
                      className="min-h-14 text-xl sm:min-h-16 sm:text-2xl"
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
                  <p role="alert" className="mb-3 w-full max-w-sm text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="grid w-full max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="primary"
                    onPress={onJudge}
                    isDisabled={isJudging}
                    isPending={isJudging}
                    className="w-full"
                  >
                    ビンゴ判定
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onPress={onReset}
                    isDisabled={isJudging}
                    className="w-full"
                  >
                    リセット
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex w-full flex-col items-center">
                <div className="w-full max-w-sm text-center">
                  {completedLines.length > 0 ? (
                    <div className="flex items-center justify-center gap-3 rounded-3xl border-2 border-emerald-500 bg-emerald-500/20 py-3 text-3xl font-extrabold text-emerald-600 shadow-sm dark:text-emerald-400">
                      <GiPartyPopper className="text-3xl sm:text-4xl" /> BINGO！
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 rounded-3xl border-2 border-destructive bg-destructive/10 py-3 text-2xl font-bold text-destructive shadow-sm">
                      <RxCross1 className="text-3xl sm:text-4xl" />
                      ビンゴはありません
                    </div>
                  )}
                  {judgedRevision !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      抽選状態 revision {judgedRevision} で判定
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onPress={onReset}
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
                onPress={onClose}
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
}
