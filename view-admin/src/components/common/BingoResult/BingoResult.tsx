import React, { ReactNode } from "react";
import styles from "./BingoResult.module.css";
import { SubscribeListNumbersSubscription } from "@/type/graphql";

interface BingoResultProps {
  bingoResultNumber: SubscribeListNumbersSubscription["numbers"];
}

export const BingoResult = (props: BingoResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>抽選済み番号一覧</div>
        <div className={styles.card_frame}>
          {[...props.bingoResultNumber].reverse().map((num, index) => (
            <div className={styles.card} key={index}>
              <div className={styles.card_content}> {num.number}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BingoResult;
