"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/utils/utils";

import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { useBingoLanguage } from "@/utils/i18n/provider";
import styles from "./PrizeCard.module.css";

interface PrizeCardProps {
  prize: PrizeWithImageUrl;
}

function PrizeImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [hasLoadError, setHasLoadError] = useState(false);

  if (imageUrl === null || hasLoadError) {
    return (
      <div className={styles.imagePlaceholder}>
        <span className="sr-only">{name}の画像は表示できません</span>
        <span aria-hidden="true">NO IMAGE</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      className={styles.prizeImage}
      sizes="(max-width: 768px) 50vw, 20vw"
      onError={() => setHasLoadError(true)}
    />
  );
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
            <PrizeImage
              key={prize.image_url ?? "no-image"}
              imageUrl={prize.image_url}
              name={prize.name_jp}
            />
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
