import React from "react";
import NumberCardSmall from "../NumberCardSmall";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";
import styles from "./NumberCardList.module.css";

interface NumberCardListProps {
  bingoNumber: SubscribeListNumbersSubscription["numbers"];
  firstNumber?: boolean;
}

const NumberCardList: React.FC<NumberCardListProps> = ({
  bingoNumber,
  firstNumber = false,
}) => {
  const numbersToRender = firstNumber ? bingoNumber.slice(1) : bingoNumber;

  return (
    <div className={styles.container}>
      {numbersToRender.map((number) => (
        <NumberCardSmall key={number.id} BingoNumber={number} />
      ))}
    </div>
  );
};

export default NumberCardList;
