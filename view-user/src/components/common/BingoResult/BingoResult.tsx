import React from "react";
import { ReactNode } from "react";
import styles from "./BingoResult.module.css";
import { BingoIcon } from "@/components/common";

interface BingoResultProps {
  bingoResultNumber: number[];
}

export const BingoResult = (props: BingoResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <BingoIcon width={24} height={24} fill="#FF0000" />
          <p>BINGO Number List</p>
        </div>
        <div className={styles.card_frame}>
          <div className={styles.large_card}>
            <div className={styles.card_content}>{props.bingoResultNumber[0]}</div>
          </div>
          <div className={styles.small_card_frame}>
            {props.bingoResultNumber.slice(1).map((num, index) => (
              <div className={styles.small_card} key={index}>
                <div className={styles.card_content}>{num}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BingoResult;
