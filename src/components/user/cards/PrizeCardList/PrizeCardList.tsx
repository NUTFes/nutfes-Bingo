import type { PrizeRow as PrizeWithImageUrl } from "@shared/bingo-transport";
import styles from "./PrizeCardList.module.css";
import PrizeCard from "../PrizeCard/PrizeCard";

interface PrizeCardListProps {
  prizes: PrizeWithImageUrl[];
}

const PrizeCardList = ({ prizes }: PrizeCardListProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        {prizes.map((prize, index) => (
          <PrizeCard key={prize.id} prize={prize} highPriority={index === 0} />
        ))}
      </div>
    </div>
  );
};

export default PrizeCardList;
