import type { NumberRow } from "@/shared/domain/bingo/types";
import styles from "./NumberCardList.module.css";
import NumberCardSmall from "../NumberCardSmall";

interface NumberCardListProps {
  bingoNumber: NumberRow[];
  firstNumber?: boolean;
  screen?: boolean;
}

const NumberCardList = ({
  bingoNumber,
  firstNumber = false,
  screen = false,
}: NumberCardListProps) => {
  const numbersToRender = firstNumber ? bingoNumber.slice(1) : bingoNumber;
  const screenNumbers = numbersToRender.slice(0, 6);

  return (
    <div className={styles.container}>
      {(screen ? screenNumbers : numbersToRender).map((number) => (
        <NumberCardSmall key={number.id} BingoNumber={number} />
      ))}
    </div>
  );
};

export default NumberCardList;
