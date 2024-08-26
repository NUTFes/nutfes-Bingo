import React from "react";
import styles from "./NumberCardLarge.module.css";
import { SubscribeListNumbersSubscription } from "@/type/graphql";

interface NumberCardLargeProps {
  bingoNumber: SubscribeListNumbersSubscription["numbers"][number];
}

const NumberCardLarge = (props: NumberCardLargeProps) => {
  const bingoNumber = props.bingoNumber;
  return (
    <div className={styles.container}>
      <div className={styles.number}>{bingoNumber.number}</div>
    </div>
  );
};

export default NumberCardLarge;
