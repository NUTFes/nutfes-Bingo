"use client";

import { Layout, PrizeCardList } from "@/components/public";
import { usePrizes } from "@/lib/bingo/client";
import type { PublicPreferences } from "@/lib/bingo/public-preferences";
import type { AppStateRow, PrizeWithImageUrl } from "@/lib/bingo/types";

interface PrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
  initialAppState: AppStateRow;
  initialPreferences: PublicPreferences;
}

export function PrizesPage({
  initialPrizes,
  initialAppState,
  initialPreferences,
}: PrizesPageProps) {
  const [prizes] = usePrizes(initialPrizes);

  return (
    <Layout initialAppState={initialAppState} initialPreferences={initialPreferences}>
      <PrizeCardList BingoPrize={prizes} />
    </Layout>
  );
}
