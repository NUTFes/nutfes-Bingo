import React from "react";
import NumberCardSmall from "../NumberCardSmall";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";
import styles from "./NumberCardList.module.css";

interface NumberCardListProps {
  bingoNumber: SubscribeListNumbersSubscription["numbers"];
  firstNumber?: boolean;
  screen?: boolean;
}

const NumberCardList: React.FC<NumberCardListProps> = ({
  bingoNumber,
  firstNumber = false,
  screen = false,
}) => {
  const numbersToRender = firstNumber ? bingoNumber.slice(1) : bingoNumber;
  const screenNumbers = numbersToRender.slice(0, 6);

  return (
    <div className={styles.container}>
      {screen
        ? screenNumbers.map((number) => (
            <NumberCardSmall key={number.id} BingoNumber={number} />
          ))
        : numbersToRender.map((number) => (
            <NumberCardSmall key={number.id} BingoNumber={number} />
          ))}
    </div>
  );
};

export default NumberCardList;
