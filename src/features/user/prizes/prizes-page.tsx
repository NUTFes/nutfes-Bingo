"use client";

import { Layout, PrizeCardList } from "@/components/user";
import { usePrizesPollingState } from "@/lib/polling";
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
  const { prizes, appState } = usePrizesPollingState(initialPrizes, initialAppState);

  return (
    <Layout appState={appState} initialPreferences={initialPreferences}>
      <PrizeCardList BingoPrize={prizes} />
    </Layout>
  );
}
