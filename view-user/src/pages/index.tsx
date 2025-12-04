import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback } from "react";
import styles from "@/styles/Home.module.css";
import { useSubscription } from "@apollo/client";
import { SubscribeListNumbersDocument } from "@/types/graphql";
import type { SubscribeListNumbersSubscription } from "@/types/graphql";
import { Layout, Loading, NumberCardLarge, NumberCardList } from "@/components";
import { ja, en } from "@/locales";
import { useAtomValue } from "jotai";
import { languageState } from "@/state/language";

type BingoNumbers = SubscribeListNumbersSubscription["numbers"];

const sortById = (bingoNumbers: BingoNumbers) => {
  return [...bingoNumbers].sort((a, b) => a.id - b.id);
};

const sortByNumber = (bingoNumbers: BingoNumbers) => {
  return [...bingoNumbers].sort((a, b) => a.number - b.number);
};

// 最後に追加されたビンゴ番号（最新の番号）を取得
const getLastBingoNumber = (bingoNumbers: BingoNumbers) => {
  const sortedById = sortById(bingoNumbers);
  return sortedById[sortedById.length - 1];
};

const getDisplayBingoNumbers = (
  isSortedAscending: boolean,
  bingoNumbers: BingoNumbers,
) => {
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

const Page: NextPage = () => {
  const { pathname: pageName, locale } = useRouter();
  const language = useAtomValue(languageState);
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);
  const { data, loading } = useSubscription(SubscribeListNumbersDocument);
  const t = locale === "ja" ? ja : en;
  const [bingoNumbers, setBingoNumbers] = useState<
    SubscribeListNumbersSubscription["numbers"]
  >([
    {
      number: 0,
      id: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const updateBingoNumbers = useCallback(() => {
    if (data) {
      setBingoNumbers(data?.numbers);
    }
  }, [data]);

  useEffect(() => {
    updateBingoNumbers();
  }, [updateBingoNumbers]);

  const displayBingoNumbers = getDisplayBingoNumbers(
    isSortedAscending,
    bingoNumbers,
  );

  return (
    <>
      {loading && <Loading />}
      <Layout
        pageName={pageName}
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
    </>
  );
};

export default Page;
