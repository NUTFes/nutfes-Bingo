import type { PrizeWithImageUrl } from "@/shared/domain/bingo/types";
import styles from "./PrizeCardList.module.css";
import PrizeCard from "../PrizeCard";

interface PrizeCardListProps {
  BingoPrize: PrizeWithImageUrl[];
}

const PrizeCardList = ({ BingoPrize }: PrizeCardListProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        {BingoPrize.map((prize) => (
          <PrizeCard key={prize.id} BingoPrize={prize} />
        ))}
      </div>
    </div>
  );
};

export default PrizeCardList;
