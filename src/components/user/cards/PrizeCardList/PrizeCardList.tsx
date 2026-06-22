import type { PrizeWithImageUrl } from "@/types/bingo/types";
import styles from "./PrizeCardList.module.css";
import PrizeCard from "../PrizeCard/PrizeCard";

interface PrizeCardListProps {
  prizes?: PrizeWithImageUrl[];
  BingoPrize?: PrizeWithImageUrl[];
}

const PrizeCardList = ({ prizes, BingoPrize }: PrizeCardListProps) => {
  const displayPrizes = prizes ?? BingoPrize ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        {displayPrizes.map((prize) => (
          <PrizeCard key={prize.id} prize={prize} />
        ))}
      </div>
    </div>
  );
};

export default PrizeCardList;
