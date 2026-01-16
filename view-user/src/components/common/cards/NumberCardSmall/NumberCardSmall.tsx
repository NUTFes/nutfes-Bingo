import React from "react";
import styles from "./NumberCardSmall.module.css";
import type { BingoNumber } from "@/lib/supabase";

interface NumberCardSmallProps {
  BingoNumber: BingoNumber;
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
