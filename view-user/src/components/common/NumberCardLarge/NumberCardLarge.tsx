import React from "react";
import styles from "./NumberCardLarge.module.css";
import { BingoNumber } from "@/type/common";

interface NumberCardLargeProps {
  BingoNumber: BingoNumber;
}

const NumberCardLarge = (props: NumberCardLargeProps) => {
  const bingoNumber = props.BingoNumber;
  return (
    <div className={styles.container}>
      <div className={styles.number}>{bingoNumber.number}</div>
    </div>
  );
};

export default NumberCardLarge;
