"use client";

import { Layout, PrizeCardList } from "@/features/user/_shared";
import { usePrizes } from "@/shared/data/realtime";
import type { PublicPreferences } from "@/shared/domain/bingo/public-preferences";
import type { AppStateRow, PrizeWithImageUrl } from "@/shared/domain/bingo/types";

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
