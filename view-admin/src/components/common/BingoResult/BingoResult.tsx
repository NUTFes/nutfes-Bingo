import React, { ReactNode } from "react";
import styles from "./BingoResult.module.css";
import { SubscribeListNumbersSubscription } from "@/type/graphql";

interface BingoResultProps {
  bingoResultNumber: SubscribeListNumbersSubscription["numbers"];
  onClick: (id: number) => void;
}

export const BingoResult = (props: BingoResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>抽選済み番号一覧</div>
        <div className={styles.card_frame}>
          {[...props.bingoResultNumber]
            .reverse()
            .sort((a, b) => a.id - b.id)
            .map((num, index) => (
              <button
                onClick={() => {
                  props.onClick(num.id);
                }}
                key={index}
                className={styles.button}
              >
                <div className={styles.card}>
                  <div className={styles.card_content}> {num.number}</div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BingoResult;
