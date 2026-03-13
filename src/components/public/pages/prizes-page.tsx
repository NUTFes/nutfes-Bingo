"use client";

import { Layout, PrizeCardList } from "@/components/public";
import { usePrizes } from "@/lib/bingo/client";
import type { AppStateRow, PrizeWithImageUrl } from "@/lib/bingo/types";

interface PrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
  initialAppState: AppStateRow;
}

export function PrizesPage({ initialPrizes, initialAppState }: PrizesPageProps) {
  const [prizes] = usePrizes(initialPrizes);

  return (
    <Layout initialAppState={initialAppState}>
      <PrizeCardList BingoPrize={prizes} />
    </Layout>
  );
}
