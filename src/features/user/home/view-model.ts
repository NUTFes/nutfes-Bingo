import type { NumberRow } from "@/types/bingo/types";

const sortById = (bingoNumbers: NumberRow[]) => [...bingoNumbers].sort((a, b) => a.id - b.id);
const sortByNumber = (bingoNumbers: NumberRow[]) =>
  [...bingoNumbers].sort((a, b) => a.number - b.number);

export function getHomeDisplayBingoNumbers(isSortedAscending: boolean, bingoNumbers: NumberRow[]) {
  if (isSortedAscending) {
    return { list: sortByNumber(bingoNumbers) };
  }

  const sortedById = sortById(bingoNumbers);
  const lastBingoNumber = sortedById[sortedById.length - 1];

  return {
    large: lastBingoNumber,
    list: sortedById.slice(0, -1).reverse(),
  };
}
