import type { NumberRow } from "@shared/bingo-transport";
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
