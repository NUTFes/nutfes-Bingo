import type { NextPage } from "next";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/Home.module.css";
import { Loading, NumberCardLarge, NumberCardList } from "@/components/common";
import Layout from "@/components/Layout";
import { ja } from "../locales/ja";
import { en } from "../locales/en";
import { useSubscription } from "@apollo/client";
import { SubscribeListNumbersDocument } from "@/type/graphql";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";
import { useResultChange } from "@/contexts/ResultChangeContext";

const Page: NextPage = () => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const { resultChange } = useResultChange();
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

  const copiedArray = [...bingoNumbers];
  const sortCopiedArray = [...bingoNumbers];
  const firstBingoNumber = copiedArray.pop()?.number ?? 0;
  const sortFirstBingoNumber =
    sortCopiedArray.sort((a, b) => a.number - b.number).shift()?.number ?? 0;

  const displayBingoNumbers = resultChange
    ? { large: firstBingoNumber, list: copiedArray.reverse() }
    : { large: sortFirstBingoNumber, list: sortCopiedArray.slice(1) };

  return (
    <>
      <Layout pageName={""}>
        <div className={styles.numberCardLarge}>
          <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          <NumberCardList bingoNumber={displayBingoNumbers.list} />
        </div>
      </Layout>
    </>
  );
};

export default Page;
