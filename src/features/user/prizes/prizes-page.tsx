"use client";

import { preload } from "react-dom";

import Layout from "@/components/user/Layout/Layout";
import PrizeCardList from "@/components/user/cards/PrizeCardList/PrizeCardList";
import Loading from "@/components/user/Loading";
import { usePrizesRealtimeState } from "@/lib/realtime";
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
  preload("/api/bingo/state", { as: "fetch", crossOrigin: "anonymous" });

  const { prizes, appState, isReady } = usePrizesRealtimeState(initialPrizes, initialAppState);

  if (!isReady) {
    return <Loading />;
  }

  return (
    <Layout appState={appState} initialPreferences={initialPreferences}>
      <PrizeCardList prizes={prizes} />
    </Layout>
  );
}
