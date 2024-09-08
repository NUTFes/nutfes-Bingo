import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback } from "react";
import styles from "@/styles/Home.module.css";
import { useSubscription } from "@apollo/client";
import { SubscribeListNumbersDocument } from "@/type/graphql";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";
import { Layout, Loading, NumberCardLarge, NumberCardList } from "@/components";
import { ja, en } from "@/locales";

type BingoNumbers = SubscribeListNumbersSubscription["numbers"];

const sortedBingoNumbers = (bingoNumbers: BingoNumbers) => {
  return [...bingoNumbers].sort((a, b) => a.id - b.id);
};

// 最後に追加されたビンゴ番号（最新の番号）を取得
const getLastBingoNumber = (bingoNumbers: BingoNumbers) => {
  const sortedNumbers = sortedBingoNumbers(bingoNumbers);
  return sortedNumbers[sortedNumbers.length - 1];
};

const getDisplayBingoNumbers = (
  isSortedAscending: boolean,
  bingoNumbers: BingoNumbers,
) => {
  const sortedNumbers = sortedBingoNumbers(bingoNumbers);
  const lastBingoNumber = getLastBingoNumber(bingoNumbers);

  return isSortedAscending
    ? { list: sortedNumbers }
    : {
        large: lastBingoNumber,
        list: sortedNumbers.slice(0, -1).reverse(),
      };
};

const Page: NextPage = () => {
  const { pathname: pageName, locale } = useRouter();
  const [language, setLanguage] = useState<string>(locale || "ja");
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);
  const { data, loading } = useSubscription(SubscribeListNumbersDocument);
  const t = locale === "ja" ? ja : en;
  const [bingoNumbers, setBingoNumbers] = useState<
    SubscribeListNumbersSubscription["numbers"]
  >([]);

  const updateBingoNumbers = useCallback(() => {
    if (data) {
      setBingoNumbers(data.numbers);
    }
  }, [data]);

  const updateLanguage = useCallback(() => {
    setLanguage(locale || "ja");
  }, [locale]);

  useEffect(() => {
    updateBingoNumbers();
  }, [updateBingoNumbers]);

  useEffect(() => {
    updateLanguage();
  }, [updateLanguage]);

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
        language={language}
        setLanguage={setLanguage}
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
