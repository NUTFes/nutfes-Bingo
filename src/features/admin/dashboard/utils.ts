import { MAX_BINGO_NUMBER, MIN_BINGO_NUMBER } from "@shared/bingo-constraints";

export const parseBingoNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < MIN_BINGO_NUMBER || parsed > MAX_BINGO_NUMBER) {
    return undefined;
  }

  return parsed;
};
