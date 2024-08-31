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

const getFirstBingoNumber = (bingoNumbers: BingoNumbers) =>
  bingoNumbers[bingoNumbers.length - 1];

const getSortedBingoNumber = (bingoNumbers: BingoNumbers) =>
  [...bingoNumbers].sort((a, b) => a.number - b.number);

const getDisplayBingoNumbers = (
  isSortedAscending: boolean,
  bingoNumbers: BingoNumbers,
) => {
  const firstBingoNumber = getFirstBingoNumber(bingoNumbers);
  const sortedBingoNumber = getSortedBingoNumber(bingoNumbers);
  return isSortedAscending
    ? { large: firstBingoNumber, list: bingoNumbers.slice(0, -1).reverse() }
    : { list: sortedBingoNumber };
};

const Page: NextPage = () => {
  const { pathname: pageName, locale } = useRouter();
  const [language, setLanguage] = useState<string>(locale || "ja");
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
          {isSortedAscending && displayBingoNumbers.large && (
            <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          )}
          <NumberCardList bingoNumber={displayBingoNumbers.list} />
        </div>
      </Layout>
    </>
  );
};

export default Page;
