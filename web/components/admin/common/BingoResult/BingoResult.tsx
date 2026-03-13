import styles from "./BingoResult.module.css";
import type { NumberRow } from "@/lib/bingo/types";

interface BingoResultProps {
  bingoResultNumber: NumberRow[];
  onClick: (id: number) => void;
}

export const BingoResult = ({ bingoResultNumber, onClick }: BingoResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>抽選済み番号一覧</div>
        <div className={styles.card_frame}>
          {[...bingoResultNumber]
            .sort((a, b) => a.id - b.id)
            .map((num) => (
              <button
                key={num.id}
                type="button"
                onClick={() => onClick(num.id)}
                className={styles.button}
              >
                <div className={styles.card}>
                  <div className={styles.card_content}>{num.number}</div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BingoResult;
