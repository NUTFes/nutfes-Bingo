import React from "react";
import styles from "./PrizeCard.module.css";
import type { Prize } from "@/lib/supabase";
import { useRouter } from "next/router";
import classNames from "classnames";
import { en, ja } from "@/locales";
import Image from "next/image";

interface PrizeCardProps {
  BingoPrize: Prize;
}

const PrizeCard = (props: PrizeCardProps) => {
  // TODO localeでnameJpとnameEnの切り替えを実装する。
  // nameEnがない場合はnameJpを表示
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;

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
          <div className={styles.imageWrapper}>
            {imageURL && prizeImage?.bucketName && prizeImage?.fileName && (
              <Image src={imageURL} alt="PrizeImage" fill />
            )}
          </div>
        </div>
        {bingoPrize.isWon && (
          <div className={classNames(styles.overlay, styles.center)}>
            <p className={styles.center}>当選済み</p>
          </div>
        )}
      </div>
      {locale === "en" ? (
        <p className={styles.text}>{bingoPrize.nameEn}</p>
      ) : (
        <p className={styles.text}>{bingoPrize.nameJp}</p>
      )}
    </div>
  );
};

export default PrizeCard;
