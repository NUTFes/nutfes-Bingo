"use client";

import { useState } from "react";

import { getHomeDisplayBingoNumbers } from "./view-model";
import { Layout, NumberCardLarge, NumberCardList } from "@/components/user";
import { useNumbers } from "@/lib/realtime";
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
    initialPreferences.isSortedAscending,
  );
  const bingoNumbers = useNumbers(initialNumbers);
  const displayBingoNumbers = getHomeDisplayBingoNumbers(isSortedAscending, bingoNumbers);

  return (
    <Layout
      initialAppState={initialAppState}
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
