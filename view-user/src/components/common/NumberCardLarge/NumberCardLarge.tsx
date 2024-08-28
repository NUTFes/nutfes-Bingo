import React from "react";
import styles from "./NumberCardLarge.module.css";
import { SubscribeListNumbersSubscription } from "@/type/graphql";

interface NumberCardLargeProps {
  bingoNumber: SubscribeListNumbersSubscription["numbers"][number];
}

const NumberCardLarge = (props: NumberCardLargeProps) => {
  return (
    <div className={styles.container}>
      <p>{props.bingoNumber.number}</p>
    </div>
  );
};

export default NumberCardLarge;
