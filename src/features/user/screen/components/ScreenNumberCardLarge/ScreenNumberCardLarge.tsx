import type { NumberRow } from "@/types/bingo/types";
import styles from "./ScreenNumberCardLarge.module.css";

interface ScreenNumberCardLargeProps {
  bingoNumber: NumberRow;
}

const ScreenNumberCardLarge = ({ bingoNumber }: ScreenNumberCardLargeProps) => {
  return (
    <output className={styles.container} aria-label={`現在の番号 ${bingoNumber.number}`}>
      <div className={styles.number}>{bingoNumber.number}</div>
    </output>
  );
};

export default ScreenNumberCardLarge;
