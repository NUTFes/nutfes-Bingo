import type { NumberRow } from "@shared/bingo-transport";
import styles from "./ScreenNumberCardList.module.css";
import ScreenNumberCardSmall from "../ScreenNumberCardSmall/ScreenNumberCardSmall";

interface ScreenNumberCardListProps {
  bingoNumber: NumberRow[];
}

const ScreenNumberCardList = ({ bingoNumber }: ScreenNumberCardListProps) => {
  // The screen typically shows up to 6 previous numbers
  const screenNumbers = bingoNumber.slice(0, 6);

  return (
    <div className={styles.container}>
      {screenNumbers.map((number) => (
        <div key={number.id} className={styles.itemWrapper}>
          <ScreenNumberCardSmall BingoNumber={number} />
        </div>
      ))}
    </div>
  );
};

export default ScreenNumberCardList;
