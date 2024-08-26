import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import styles from "@/styles/Home.module.css";
import { ja, en } from "@/locales";
import { useSubscription } from "@apollo/client";
import { SubscribeListNumbersDocument } from "@/type/graphql";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";
import { Layout, NumberCardLarge, NumberCardList } from "@/components";

const Page: NextPage = () => {
  const { pathname: pageName, locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);
  const [bingoNumbers, setBingoNumbers] = useState<
    SubscribeListNumbersSubscription["numbers"]
  >([]);
  const { data } = useSubscription(SubscribeListNumbersDocument);

  // Subscription handling useEffect
  useEffect(() => {
    if (data) {
      setBingoNumbers(data.numbers);
    }
  }, [data]);

  const defaultBingoNumber = {
    number: 0,
    id: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const copiedArray = [...bingoNumbers];
  const sortCopiedArray = [...bingoNumbers];
  const firstBingoNumber = copiedArray.pop() ?? defaultBingoNumber;
  const sortFirstBingoNumber =
    sortCopiedArray.sort((a, b) => a.number - b.number).shift() ??
    defaultBingoNumber;

  const displayBingoNumbers = isSortedAscending
    ? { large: firstBingoNumber, list: copiedArray.reverse() }
    : { large: sortFirstBingoNumber, list: sortCopiedArray.slice(1) };

  return (
    <>
      <Layout
        pageName={pageName}
        isSortedAscending={isSortedAscending}
        setIsSortedAscending={setIsSortedAscending}
      >
        <div className={styles.numberCardLarge}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <NumberCardList bingoNumber={displayBingoNumbers.list} />
        </div>
      </Layout>
    </>
  );
};

export default Page;
