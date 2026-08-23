import type { PrizeWithImageUrl } from "@/types/bingo/types";
import styles from "./PrizeCardList.module.css";
import PrizeCard from "../PrizeCard/PrizeCard";

interface PrizeCardListProps {
  prizes: PrizeWithImageUrl[];
}

const PrizeCardList = ({ prizes }: PrizeCardListProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        {prizes.map((prize) => (
          <PrizeCard key={prize.id} prize={prize} />
        ))}
      </div>
    </div>
  );
};

export default PrizeCardList;
