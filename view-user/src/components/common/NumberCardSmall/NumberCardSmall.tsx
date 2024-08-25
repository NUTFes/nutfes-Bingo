import React from "react";
import styles from "./NumberCardSmall.module.css";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";

interface NumberCardSmallProps {
  BingoNumber: SubscribeListNumbersSubscription["numbers"][number];
}

const NumberCardSmall = (props: NumberCardSmallProps) => {
  const bingoNumber = props.BingoNumber;
  return (
    <div className={styles.container}>
      <div className={styles.number}>{bingoNumber.number}</div>
    </div>
  );
};

export default NumberCardSmall;
