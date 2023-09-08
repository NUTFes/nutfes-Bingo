import React from "react";
import Image from "next/image";
import styles from "./BingoResult.module.css";
import { BingoIcon, Button } from "@/components/common";
import { BingoNumber } from "@/utils/api_methods";
import { useState } from "react";

interface BingoResultProps {
  bingoResultNumber: BingoNumber[];
}

export const BingoResult = (props: BingoResultProps) => {
  const [resultChange, setResultChange] = useState<boolean>(true);
  const copiedArray = [...props.bingoResultNumber];
  const sortCopiedArray = [...props.bingoResultNumber];
  const firstBingoNumber = copiedArray.pop();
  const sortFirstBingoNumber = sortCopiedArray
    .sort((a, b) => a.data - b.data)
    .shift();

  function ResultNumber() {
    if (resultChange) {
      return (
        <>
          <div className={styles.card_frame}>
            <div className={styles.large_card}>{firstBingoNumber?.data}</div>
            <div className={styles.small_card_frame}>
              {[...props.bingoResultNumber]
                .slice(0, -1)
                .reverse()
                .map((num, index) => (
                  <div className={styles.small_card} key={index}>
                    <div>{num.data}</div>
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
              {sortFirstBingoNumber?.data}
            </div>
            <div className={styles.small_card_frame}>
              {[...props.bingoResultNumber]
                .sort((a, b) => a.data - b.data)
                .slice(1)
                .map((num, index) => (
                  <div className={styles.small_card} key={index}>
                    <div>{num.data}</div>
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
          <p>BINGO Number</p>
          <div className={styles.frame_title_button}>
            <Button
              size="s"
              shape="square"
              onClick={() => setResultChange(true)}
            >
              抽選順
            </Button>
            <Button
              size="s"
              shape="square"
              onClick={() => setResultChange(false)}
            >
              昇　順
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
