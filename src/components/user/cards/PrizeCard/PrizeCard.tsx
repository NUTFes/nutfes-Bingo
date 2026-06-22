"use client";

import Image from "next/image";
import { cn } from "@/utils/utils";

import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { useBingoLanguage } from "@/utils/i18n/provider";
import styles from "./PrizeCard.module.css";

interface PrizeCardProps {
  prize: PrizeWithImageUrl;
}

const PrizeCard = ({ prize }: PrizeCardProps) => {
  const { language } = useBingoLanguage();
  const prizeName = language === "en" ? prize.name_en || prize.name_jp : prize.name_jp;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.image}>
          <div
            className={cn(styles.imageWrapper, {
              [styles.wonImage]: prize.is_won,
            })}
          >
            {prize.image_url && (
              <Image
                src={prize.image_url}
                alt={prize.name_jp}
                fill
                className={styles.prizeImage}
                sizes="(max-width: 768px) 50vw, 20vw"
              />
            )}
          </div>
        </div>
        {prize.is_won && (
          <div className={styles.overlay}>
            <span className={styles.wonBadge}>当選済み</span>
          </div>
        )}
      </div>
      <p className={styles.text}>{prizeName}</p>
    </div>
  );
};

export default PrizeCard;
