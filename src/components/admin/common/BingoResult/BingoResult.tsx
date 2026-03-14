import { useMemo } from "react";
import { GridLayout, GridList, GridListItem, Size, Virtualizer } from "react-aria-components";

import type { NumberRow } from "@/lib/bingo/types";
import { AdminPanel } from "@/components/admin/ui/panel";

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
    <AdminPanel
      title="抽選済み番号一覧"
      description="番号を押すと修正できます。"
      contentClassName="space-y-3 sm:space-y-4"
    >
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
    </AdminPanel>
  );
};

export default BingoResult;
