const MIN_BINGO_NUMBER = 1;
const MAX_BINGO_NUMBER = 99;

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
