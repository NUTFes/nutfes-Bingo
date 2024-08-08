import React from "react";
import styles from "./NumberCardSmall.module.css";
import { BingoNumber } from "@/type/common";

interface NumberCardSmallProps {
  BingoNumber: BingoNumber;
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
