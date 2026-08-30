import type { NumberRow } from "@shared/bingo-transport";
import styles from "./NumberCardSmall.module.css";

interface NumberCardSmallProps {
  BingoNumber: NumberRow;
}

const NumberCardSmall = ({ BingoNumber }: NumberCardSmallProps) => {
  return (
    <div className={styles.container}>
      <p>{BingoNumber.number}</p>
    </div>
  );
};

export default NumberCardSmall;
