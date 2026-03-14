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
    <div className="py-3 sm:py-4">
      <AdminPanel title="抽選済み番号一覧" description="番号を押すと修正できます。">
        <Virtualizer
          layout={GridLayout}
          layoutOptions={{
            minItemSize: new Size(88, 88),
            minSpace: new Size(12, 12),
            maxColumns: 8,
            preserveAspectRatio: true,
          }}
        >
          <GridList
            layout="grid"
            aria-label="抽選済み番号一覧"
            selectionMode="none"
            items={sortedNumbers}
            className="block h-[22rem] w-full overflow-auto rounded-2xl"
          >
            {(num) => (
              <GridListItem id={num.id} textValue={`${num.number}`} className="h-full w-full p-0">
                <button
                  type="button"
                  onClick={() => onClick(num.id)}
                  className="h-full w-full rounded-2xl border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-1 text-2xl font-extrabold leading-none text-[var(--admin-card-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--admin-border)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--main-color)_42%,transparent)] sm:text-3xl"
                >
                  {num.number}
                </button>
              </GridListItem>
            )}
          </GridList>
        </Virtualizer>
      </AdminPanel>
    </div>
  );
};

export default BingoResult;
