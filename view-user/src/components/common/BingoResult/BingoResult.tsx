import React from "react";
import Image from "next/image";
import styles from "./BingoResult.module.css";
import { BingoIcon } from "@/components/common";
import { BingoNumber } from "@/utils/api_methods";

interface BingoResultProps {
  bingoResultNumber: BingoNumber[];
}

export const BingoResult = (props: BingoResultProps) => {
  const copiedArray = [...props.bingoResultNumber];
  const firstBingoNumber = copiedArray.pop();

  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <Image src="/BingoCard.svg" alt="BingoCard" width={25} height={25} />
          <p>BINGO Number List</p>
        </div>
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
      </div>
    </div>
  );
};

export default BingoResult;
