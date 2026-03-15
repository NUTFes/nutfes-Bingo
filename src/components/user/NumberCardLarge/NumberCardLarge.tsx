import type { NumberRow } from "@/types/bingo/types";
import styles from "./NumberCardLarge.module.css";

interface NumberCardLargeProps {
  bingoNumber: NumberRow;
}

const NumberCardLarge = ({ bingoNumber }: NumberCardLargeProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.number}>{bingoNumber.number}</div>
    </div>
  );
};

export default NumberCardLarge;
