import React from "react";
import styles from "./PrizeCardList.module.css";
import PrizeCard from "../PrizeCard";
import { BingoPrize } from "@/type/common";

interface PrizeCardListProps {
  BingoPrize: BingoPrize[];
}

const PrizeCardList = (props: PrizeCardListProps) => {
  const BingoPrizes = props.BingoPrize;

  return (
    <div className={styles.container}>
      {BingoPrizes.map((prize) => (
        <PrizeCard key={prize.id} BingoPrize={prize} />
      ))}
    </div>
  );
};

export default PrizeCardList;
