"use client";

import { Layout, PrizeCardList } from "@/components/user";
import { usePrizes } from "@/lib/realtime";
import type { PublicPreferences } from "@/types/bingo/public-preferences";
import type { AppStateRow, PrizeWithImageUrl } from "@/types/bingo/types";

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
