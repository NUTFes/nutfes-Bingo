import { useMemo } from "react";
import { GridLayout, GridList, GridListItem, Size, Virtualizer } from "react-aria-components";

import type { NumberRow } from "@/types/bingo/types";
import { Separator } from "@/components/ui/Separator";

interface BingoResultProps {
  bingoResultNumber: NumberRow[];
  onClick: (id: number) => void;
}

export const BingoResult = ({ bingoResultNumber, onClick }: BingoResultProps) => {
  const sortedNumbers = useMemo(
    () => [...bingoResultNumber].sort((a, b) => a.id - b.id),
    [bingoResultNumber],
  );

  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
        <div className="max-w-3xl space-y-2">
          <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
            抽選済み番号一覧
          </h2>
          <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
            番号を押すと修正できます。
          </p>
        </div>
      </header>
      <Separator className="mb-4 opacity-70" />
      <div className="space-y-3 sm:space-y-4">
        <p className="text-sm text-zinc-400">登録済み: {sortedNumbers.length} 件</p>
        <Virtualizer
          layout={GridLayout}
          layoutOptions={{
            minItemSize: new Size(84, 84),
            maxColumns: 8,
          }}
        >
          <GridList layout="grid" aria-label="抽選済み番号一覧" items={sortedNumbers}>
            {(num) => (
              <GridListItem id={num.id} textValue={`${num.number}`}>
                <button
                  type="button"
                  onClick={() => onClick(num.id)}
                  className="h-full w-full aspect-square rounded-2xl bg-zinc-50 text-4xl font-extrabold text-zinc-900"
                >
                  {num.number}
                </button>
              </GridListItem>
            )}
          </GridList>
        </Virtualizer>
      </div>
    </section>
  );
};

export default BingoResult;
