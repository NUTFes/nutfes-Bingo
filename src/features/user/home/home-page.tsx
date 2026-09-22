import { useState } from "react";

import { getHomeDisplayBingoNumbers } from "./view-model";
import Layout from "@/components/user/Layout/Layout";
import NumberCardLarge from "@/components/user/NumberCardLarge";
import NumberCardList from "@/components/user/cards/NumberCardList";
import Loading from "@/components/user/Loading";
import { useHomeRealtimeState } from "@/lib/realtime";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/types/bingo/public-preferences";
import styles from "@/styles/user/home.module.css";

export function HomePage() {
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(
    DEFAULT_PUBLIC_PREFERENCES.isSortedAscending,
  );
  const { numbers, appState, isReady } = useHomeRealtimeState();
  const displayBingoNumbers = getHomeDisplayBingoNumbers(isSortedAscending, numbers);

  if (!isReady) {
    return <Loading />;
  }

  return (
    <Layout
      appState={appState}
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
