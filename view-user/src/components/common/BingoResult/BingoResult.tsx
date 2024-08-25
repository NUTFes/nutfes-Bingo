import React, { useState } from "react";
import Image from "next/image";
import styles from "./BingoResult.module.css";
import { BingoIcon, Button } from "@/components/common";
import { useRouter } from "next/router";
import { ja } from "@/locales/ja";
import { en } from "@/locales/en";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";
interface BingoResultProps {
  bingoResultNumber: SubscribeListNumbersSubscription["numbers"];
}

export const BingoResult = (props: BingoResultProps) => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [resultChange, setResultChange] = useState<boolean>(true);
  const copiedArray = [...props.bingoResultNumber];
  const sortCopiedArray = [...props.bingoResultNumber];
  const firstBingoNumber = copiedArray.pop();
  const sortFirstBingoNumber = sortCopiedArray
    .sort((a, b) => a.number - b.number)
    .shift();

  function ResultNumber() {
    if (resultChange) {
      return (
        <>
          <div className={styles.card_frame}>
            <div className={styles.large_card}>{firstBingoNumber?.number}</div>
            <div className={styles.small_card_frame}>
              {[...props.bingoResultNumber]
                .slice(0, -1)
                .reverse()
                .map((num, index) => (
                  <div className={styles.small_card} key={index}>
                    <div>{num.number}</div>
                  </div>
                ))}
            </div>
          </div>
        </>
      );
    } else {
      return (
        <>
          <div className={styles.card_frame}>
            <div className={styles.large_card}>
              {sortFirstBingoNumber?.number}
            </div>
            <div className={styles.small_card_frame}>
              {[...props.bingoResultNumber]
                .sort((a, b) => a.number - b.number)
                .slice(1)
                .map((num, index) => (
                  <div className={styles.small_card} key={index}>
                    <div>{num.number}</div>
                  </div>
                ))}
            </div>
          </div>
        </>
      );
    }
  }

  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <Image src="/BingoCard.svg" alt="BingoCard" width={20} height={20} />
          <p>{t.SUB_TITLE_NUMBER}</p>
          <div className={styles.frame_title_button}>
            <Button
              size="xm"
              shape="square"
              onClick={() => setResultChange(!resultChange)}
            >
              {resultChange ? (
                <p>{t.NUMBER_ORDER_BUTTON}</p>
              ) : (
                <p>{t.LOTTERY_ORDER_BUTTON}</p>
              )}
            </Button>
          </div>
        </div>
        <div className={styles.card_frame}>
          <ResultNumber />
        </div>
      </div>
    </div>
  );
};

export default BingoResult;
