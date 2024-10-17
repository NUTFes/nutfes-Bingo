import React from "react";
import styles from "./NumberCardSmall.module.css";
import type { SubscribeListNumbersSubscription } from "@/types/graphql";

interface NumberCardSmallProps {
  BingoNumber: SubscribeListNumbersSubscription["numbers"][number];
}

const NumberCardSmall = (props: NumberCardSmallProps) => {
  const bingoNumber = props.BingoNumber;
  return (
    <div className={styles.container}>
      <p>{bingoNumber.number}</p>
    </div>
  );
};

export default NumberCardSmall;
