import React from "react";
import styles from "./NumberCardLarge.module.css";

interface NumberCardLargeProps {
  bingoNumber: number;
}

const NumberCardLarge = (props: NumberCardLargeProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.number}>{props.bingoNumber}</div>
    </div>
  );
};

export default NumberCardLarge;
