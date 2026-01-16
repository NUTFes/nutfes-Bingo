import React from "react";
import styles from "./PrizeCardList.module.css";
import PrizeCard from "../PrizeCard";
import type { Prize } from "@/lib/supabase";

interface PrizeCardListProps {
  BingoPrize: Prize[];
}

const PrizeCardList = (props: PrizeCardListProps) => {
  const BingoPrizes = props.BingoPrize;

  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        {BingoPrizes.map((prize) => (
          <PrizeCard key={prize.id} BingoPrize={prize} />
        ))}
      </div>
    </div>
  );
};

export default PrizeCardList;
