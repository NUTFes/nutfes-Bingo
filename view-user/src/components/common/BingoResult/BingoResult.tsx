import React from "react";
import { ReactNode } from "react";
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
          <BingoIcon width={24} height={24} fill="#FF0000" />
          <p>BINGO Number List</p>
        </div>
        <div className={styles.card_frame}>
          <div className={styles.large_card}>
            <div className={styles.card_content}>
              {firstBingoNumber?.data}
            </div>
          </div>
          <div className={styles.small_card_frame}>
            {[...props.bingoResultNumber].slice(0, -1).reverse().map((num, index) => (
              <div className={styles.small_card} key={index}>
                <div className={styles.card_content}>{num.data}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BingoResult;
