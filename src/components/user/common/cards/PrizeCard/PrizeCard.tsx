"use client";

import React from "react";
import styles from "./PrizeCard.module.css";
import type { Prize } from "@/types";
import classNames from "classnames";
import Image from "next/image";
import { useUserStore } from "@/stores/useUserStore";

interface PrizeCardProps {
  BingoPrize: Prize;
}

const PrizeCard = (props: PrizeCardProps) => {
  // TODO localeでnameJpとnameEnの切り替えを実装する。
  // nameEnがない場合はnameJpを表示
  const language = useUserStore((state) => state.language);

  const bingoPrize = props.BingoPrize;
  const prizeImage = bingoPrize.image;

  const imageURL: string = (() => {
    if (!prizeImage) return "";
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (!baseUrl || !prizeImage.bucketName || !prizeImage.fileName) return "";
    return `${baseUrl}/storage/v1/object/public/${prizeImage.bucketName}/${prizeImage.fileName}`;
  })();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.image}>
          <div
            className={classNames(styles.imageWrapper, {
              [styles.wonImage]: bingoPrize.isWon,
            })}
          >
            {imageURL && prizeImage?.bucketName && prizeImage?.fileName && (
              <Image src={imageURL} alt="PrizeImage" fill />
            )}
          </div>
        </div>
        {bingoPrize.isWon && (
          <div className={styles.overlay}>
            <span className={styles.wonBadge}>当選済み</span>
          </div>
        )}
      </div>
      {language === "en" ? (
        <p className={styles.text}>{bingoPrize.nameEn}</p>
      ) : (
        <p className={styles.text}>{bingoPrize.nameJp}</p>
      )}
    </div>
  );
};

export default PrizeCard;
