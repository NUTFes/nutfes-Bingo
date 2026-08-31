import type { NumberRow } from "@shared/bingo-transport";
import styles from "./ScreenNumberCardSmall.module.css";

interface ScreenNumberCardSmallProps {
  BingoNumber: NumberRow;
}

const ScreenNumberCardSmall = ({ BingoNumber }: ScreenNumberCardSmallProps) => {
  return (
    <div className={styles.container}>
      <span>{BingoNumber.number}</span>
    </div>
  );
};

export default ScreenNumberCardSmall;
