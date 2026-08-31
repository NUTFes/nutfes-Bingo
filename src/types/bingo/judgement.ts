export type BingoCard = string[][];
export type CellPos = { row: number; col: number };
export type LineId = `row-${number}` | `col-${number}` | "diag-main" | "diag-anti";
type Line = { id: LineId; cells: CellPos[] };

export const BOARD_SIZE = 5;
const CENTER: CellPos = { row: 2, col: 2 };
const FREE = "FREE";

export const createEmptyBingoCard = (): BingoCard => {
  const card = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ""),
  );
  card[CENTER.row][CENTER.col] = FREE;
  return card;
};

export const isCenter = (row: number, col: number) => row === CENTER.row && col === CENTER.col;

const isCellSatisfied = (cell: string, drawnNumbers: number[]) => {
  if (cell === FREE) return true;
  if (cell === "") return false;
  const num = Number.parseInt(cell, 10);
  return !Number.isNaN(num) && drawnNumbers.includes(num);
};

export const getRowLineId = (row: number): LineId => `row-${row}`;
export const getColLineId = (col: number): LineId => `col-${col}`;
export const getDiagMainLineId = (): LineId => "diag-main";
export const getDiagAntiLineId = (): LineId => "diag-anti";

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

export function getCompletedLines(card: BingoCard, drawnNumbers: number[]): LineId[] {
  const done: LineId[] = [];
  for (const line of ALL_LINES) {
    const ok = line.cells.every(({ row, col }) => isCellSatisfied(card[row][col], drawnNumbers));
    if (ok) {
      done.push(line.id);
    }
  }
  return done;
}
