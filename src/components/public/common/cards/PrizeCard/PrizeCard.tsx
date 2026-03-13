"use client";

import Image from "next/image";
import classNames from "classnames";

import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { useBingoLanguage } from "@/lib/i18n/provider";
import styles from "./PrizeCard.module.css";

interface PrizeCardProps {
  BingoPrize: PrizeWithImageUrl;
}

const PrizeCard = ({ BingoPrize }: PrizeCardProps) => {
  const { language } = useBingoLanguage();
  const prizeName =
    language === "en" ? BingoPrize.name_en || BingoPrize.name_jp : BingoPrize.name_jp;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.image}>
          <div className={styles.imageWrapper}>
            {BingoPrize.image_url && (
              <Image
                src={BingoPrize.image_url}
                alt={BingoPrize.name_jp}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
              />
            )}
          </div>
        </div>
        {BingoPrize.is_won && (
          <div className={classNames(styles.overlay, styles.center)}>
            <p className={styles.center}>当選済み</p>
          </div>
        )}
      </div>
      <p className={styles.text}>{prizeName}</p>
    </div>
  );
};

export default PrizeCard;
