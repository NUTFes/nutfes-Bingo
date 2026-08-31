import { useEffect, useRef, useState } from "react";

import { fetchAdminState } from "@/lib/admin-api";
import { MAX_BINGO_NUMBER, MIN_BINGO_NUMBER } from "@shared/bingo-constraints";
import {
  type BingoCard,
  type CellPos,
  type LineId,
  createEmptyBingoCard,
  getCompletedLines,
  isCenter,
} from "@/types/bingo/judgement";
import type { NumberRow } from "@shared/bingo-transport";
import { JudgementModalView } from "./JudgementModalView";

const MAX_DIGIT_LENGTH = 2;

interface JudgementModalProps {
  isOpened: boolean;
  canCloseByClickingBackground?: boolean;
  setIsOpened: (isOpened: boolean) => void;
  onNumbersRefresh: (numbers: NumberRow[]) => void;
}

interface JudgementState {
  selectedCell: CellPos | null;
  inputValue: string;
  hasJudged: boolean;
  completedLines: LineId[];
  judgedRevision: number | null;
  error: string | null;
}

const createInitialJudgementState = (): JudgementState => ({
  selectedCell: { row: 0, col: 0 },
  inputValue: "",
  hasJudged: false,
  completedLines: [],
  judgedRevision: null,
  error: null,
});

const setCardValue = (card: BingoCard, pos: CellPos, value: string): BingoCard =>
  card.map((row, rowIndex) =>
    rowIndex === pos.row ? row.map((cell, colIndex) => (colIndex === pos.col ? value : cell)) : row,
  );

const JudgementModal = ({
  isOpened,
  canCloseByClickingBackground = true,
  setIsOpened,
  onNumbersRefresh,
}: JudgementModalProps) => {
  const [bingoCard, setBingoCard] = useState<BingoCard>(() => createEmptyBingoCard());
  const [judgementState, setJudgementState] = useState<JudgementState>(createInitialJudgementState);
  const [isJudging, setIsJudging] = useState(false);
  const judgeControllerRef = useRef<AbortController | null>(null);
  const { selectedCell, inputValue, hasJudged, completedLines, judgedRevision, error } =
    judgementState;

  useEffect(
    () => () => {
      judgeControllerRef.current?.abort();
    },
    [],
  );

  const finalizePendingInput = (commitState: boolean): BingoCard => {
    let working = bingoCard;
    if (!hasJudged && inputValue && selectedCell) {
      working = setCardValue(bingoCard, selectedCell, inputValue);
      if (commitState) {
        setBingoCard(working);
        setJudgementState((prev) => ({ ...prev, inputValue: "" }));
      }
    }
    return working;
  };

  const resetAll = () => {
    judgeControllerRef.current?.abort();
    setIsJudging(false);
    setBingoCard(createEmptyBingoCard());
    setJudgementState(createInitialJudgementState());
  };

  const closeModal = () => {
    setIsOpened(false);
    resetAll();
  };

  const commitValueAt = (pos: CellPos, value: string) => {
    setBingoCard((prev) => setCardValue(prev, pos, value));
    setJudgementState((prev) => ({ ...prev, inputValue: "" }));
  };

  const handleJudge = async () => {
    if (isJudging) return;
    const controller = new AbortController();
    judgeControllerRef.current?.abort();
    judgeControllerRef.current = controller;
    setIsJudging(true);
    setJudgementState((previous) => ({ ...previous, error: null }));
    try {
      const authoritativeState = await fetchAdminState(controller.signal);
      const workingCard = finalizePendingInput(false);
      const drawnNumbers = authoritativeState.numbers.map((number) => number.number);
      const done = getCompletedLines(workingCard, drawnNumbers);
      onNumbersRefresh(authoritativeState.numbers);
      setBingoCard(workingCard);
      setJudgementState((previous) => ({
        ...previous,
        completedLines: done,
        hasJudged: true,
        selectedCell: null,
        inputValue: "",
        judgedRevision: authoritativeState.revision,
        error: null,
      }));
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
        console.error(requestError);
        setJudgementState((previous) => ({
          ...previous,
          error: "抽選番号を確認できませんでした。接続を確認して、もう一度判定してください。",
        }));
      }
    } finally {
      if (judgeControllerRef.current === controller) {
        judgeControllerRef.current = null;
        setIsJudging(false);
      }
    }
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
    if (Number.isNaN(n) || n < MIN_BINGO_NUMBER || n > MAX_BINGO_NUMBER) return;
    setJudgementState((prev) => ({ ...prev, inputValue: next }));
  };

  const handleDelete = () => {
    if (hasJudged || !selectedCell) return;
    setJudgementState((prev) => ({ ...prev, inputValue: "" }));
    setBingoCard((prev) => setCardValue(prev, selectedCell, ""));
  };

  const handleCommit = () => {
    if (hasJudged || !selectedCell || !inputValue) return;
    commitValueAt(selectedCell, inputValue);
  };

  return (
    <JudgementModalView
      isOpened={isOpened}
      canCloseByClickingBackground={canCloseByClickingBackground}
      bingoCard={bingoCard}
      selectedCell={selectedCell}
      inputValue={inputValue}
      hasJudged={hasJudged}
      completedLines={completedLines}
      judgedRevision={judgedRevision}
      error={error}
      isJudging={isJudging}
      onClose={closeModal}
      onCellClick={handleCellClick}
      onDigitClick={handleDigitClick}
      onDelete={handleDelete}
      onCommit={handleCommit}
      onJudge={() => void handleJudge()}
      onReset={resetAll}
    />
  );
};

export default JudgementModal;
