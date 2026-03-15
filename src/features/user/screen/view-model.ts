import type { NumberRow } from "@/types/bingo/types";

function sortById(bingoNumbers: NumberRow[]) {
  return [...bingoNumbers].sort((a, b) => a.id - b.id);
}

export function getScreenDisplayBingoNumbers(bingoNumbers: NumberRow[]) {
  const sortedNumbers = sortById(bingoNumbers);
  const large = sortedNumbers[sortedNumbers.length - 1] ?? {
    id: 0,
    number: 0,
    created_at: "",
    updated_at: "",
  };

  return {
    large,
    list: sortedNumbers.slice(0, -1).reverse(),
  };
}
