import React from "react";
import { ReactNode } from "react";
import styles from "./BingoResult.module.css";

interface BingoResultProps {
  bingoResultNumber: number[];
}

export const BingoResult = (props: BingoResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>抽選済み番号一覧</div>
        <div className={styles.card_frame}>
            {props.bingoResultNumber.map((num, index) => 
              <div className={styles.card} key={index}>
                <div className={styles.card_content}> {num}</div>
              </div>)}
          </div>
        </div>
      </div>
  );
};

export default BingoResult;
