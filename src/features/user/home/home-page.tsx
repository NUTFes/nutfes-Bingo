"use client";

import { useState } from "react";

import { getHomeDisplayBingoNumbers } from "./view-model";
import Layout from "@/components/user/Layout/Layout";
import NumberCardLarge from "@/components/user/NumberCardLarge";
import NumberCardList from "@/components/user/cards/NumberCardList";
import Loading from "@/components/user/Loading";
import { useHomeRealtimeState } from "@/lib/realtime";
import type { PublicPreferences } from "@/types/bingo/public-preferences";
import type { AppStateRow, NumberRow } from "@/types/bingo/types";
import styles from "@/styles/user/home.module.css";

interface HomePageProps {
  initialNumbers: NumberRow[];
  initialAppState: AppStateRow;
  initialPreferences: PublicPreferences;
}

export function HomePage({ initialNumbers, initialAppState, initialPreferences }: HomePageProps) {
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(
    () => initialPreferences.isSortedAscending,
  );
  const { numbers, appState, isReady } = useHomeRealtimeState(initialNumbers, initialAppState);
  const displayBingoNumbers = getHomeDisplayBingoNumbers(isSortedAscending, numbers);

  if (!isReady) {
    return <Loading />;
  }

  return (
    <Layout
      appState={appState}
      initialPreferences={initialPreferences}
      isSortedAscending={isSortedAscending}
      setIsSortedAscending={setIsSortedAscending}
    >
      <div className={styles.numberCardLarge}>
        {!isSortedAscending && displayBingoNumbers.large && (
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
        )}
        <NumberCardList bingoNumber={displayBingoNumbers.list} />
      </div>
    </Layout>
  );
}
