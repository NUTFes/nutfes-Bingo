"use client";

import { useState } from "react";

import { Layout, NumberCardLarge, NumberCardList } from "@/components/public";
import { useNumbers } from "@/lib/bingo/client";
import type { PublicPreferences } from "@/lib/bingo/public-preferences";
import type { AppStateRow, NumberRow } from "@/lib/bingo/types";
import styles from "@/styles/public/Home.module.css";

interface HomePageProps {
  initialNumbers: NumberRow[];
  initialAppState: AppStateRow;
  initialPreferences: PublicPreferences;
}

const sortById = (bingoNumbers: NumberRow[]) => [...bingoNumbers].sort((a, b) => a.id - b.id);
const sortByNumber = (bingoNumbers: NumberRow[]) =>
  [...bingoNumbers].sort((a, b) => a.number - b.number);

const getDisplayBingoNumbers = (isSortedAscending: boolean, bingoNumbers: NumberRow[]) => {
  if (isSortedAscending) {
    return { list: sortByNumber(bingoNumbers) };
  }

  const sortedById = sortById(bingoNumbers);
  const lastBingoNumber = sortedById[sortedById.length - 1];

  return {
    large: lastBingoNumber,
    list: sortedById.slice(0, -1).reverse(),
  };
};

export function HomePage({ initialNumbers, initialAppState, initialPreferences }: HomePageProps) {
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(
    initialPreferences.isSortedAscending,
  );
  const bingoNumbers = useNumbers(initialNumbers);
  const displayBingoNumbers = getDisplayBingoNumbers(isSortedAscending, bingoNumbers);

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
