import React from "react";
import styles from "./NumberCardLarge.module.css";
import type { BingoNumber } from "@/types";

interface NumberCardLargeProps {
  bingoNumber: BingoNumber;
}

const NumberCardLarge = (props: NumberCardLargeProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.number}>{props?.bingoNumber?.number}</div>
    </div>
  );
};

export default NumberCardLarge;
