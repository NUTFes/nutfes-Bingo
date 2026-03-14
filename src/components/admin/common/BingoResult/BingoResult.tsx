import type { NumberRow } from "@/lib/bingo/types";
import { AdminPanel } from "@/components/admin/ui";

interface BingoResultProps {
  bingoResultNumber: NumberRow[];
  onClick: (id: number) => void;
}

export const BingoResult = ({ bingoResultNumber, onClick }: BingoResultProps) => {
  return (
    <div className="py-3 sm:py-4">
      <AdminPanel
        title="抽選済み番号一覧"
        description={`${bingoResultNumber.length}件の番号が抽選済みです。番号を押すと修正できます。`}
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {[...bingoResultNumber]
            .sort((a, b) => a.id - b.id)
            .map((num) => (
              <button
                key={num.id}
                type="button"
                onClick={() => onClick(num.id)}
                className="aspect-square min-h-16 rounded-2xl border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-1 text-2xl font-extrabold leading-none text-[var(--admin-card-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--admin-border)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--main-color)_42%,transparent)] sm:min-h-20 sm:text-3xl"
              >
                {num.number}
              </button>
            ))}
        </div>
      </AdminPanel>
    </div>
  );
};

export default BingoResult;
