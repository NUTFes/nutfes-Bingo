import { useMemo } from "react";
import { GridLayout, GridList, GridListItem, Size, Virtualizer } from "react-aria-components";

import type { NumberRow } from "@/types/bingo/types";
import { Separator } from "@/components/ui/Separator";

interface BingoResultProps {
  bingoResultNumber: NumberRow[];
  onClick: (id: number) => void;
}

const BingoResult = ({ bingoResultNumber, onClick }: BingoResultProps) => {
  const sortedNumbers = useMemo(
    () => bingoResultNumber.toSorted((a, b) => a.id - b.id),
    [bingoResultNumber],
  );

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl space-y-1">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            抽選済み番号一覧
          </h2>
          <p className="text-sm text-muted-foreground">
            番号を押すと修正できます。
          </p>
        </div>
        <p className="inline-flex h-9 items-center rounded-full border border-border bg-card/50 px-3 text-sm text-muted-foreground">
          登録済み: {sortedNumbers.length} 件
        </p>
      </header>
      
      <div className="space-y-3 sm:space-y-4">
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
                  className="h-full w-full aspect-square rounded-2xl bg-primary text-4xl font-extrabold text-primary-foreground transition hover:bg-primary/90 active:scale-95 active:bg-primary/80"
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
