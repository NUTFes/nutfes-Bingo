import type { NumberRow } from "@/types/bingo/types";
import styles from "./NumberCardList.module.css";
import NumberCardSmall from "../NumberCardSmall/NumberCardSmall";

interface NumberCardListProps {
  bingoNumber: NumberRow[];
}

const NumberCardList = ({ bingoNumber }: NumberCardListProps) => {
  return (
    <div className={styles.container}>
      {bingoNumber.map((number) => (
        <NumberCardSmall key={number.id} BingoNumber={number} />
      ))}
    </div>
  );
};

export default NumberCardList;
