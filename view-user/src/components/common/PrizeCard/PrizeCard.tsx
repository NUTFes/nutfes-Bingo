import React from "react";
import styles from "./PrizeCard.module.css";
import { BingoPrize } from "@/type/common";
import { useRouter } from "next/router";
import { ja } from "@/locales/ja";
import { en } from "@/locales/en";
import classNames from "classnames";

interface PrizeCardProps {
  BingoPrize: BingoPrize;
}

const PrizeCard = (props: PrizeCardProps) => {
  // TODO lacaleでnameJpとnameEnの切り替えを実装する。
  // nameEnがない場合はnameJpを表示
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;

  const bingoPrize = props.BingoPrize;
  const prizeImage = bingoPrize.prizeImage;

  const imageURL: string = prizeImage
    ? `${process.env.NEXT_PUBLIC_MINIO_ENDPONT}/${prizeImage.bucketName}/${prizeImage.fileName}`
    : "";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div
          className={styles.image}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
          <img
            src={imageURL}
            alt="PrizeImage"
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
        {bingoPrize.isWon && (
          <div className={classNames(styles.overlay, styles.center)}>
            <p className={styles.center}>{t.WINNING_OVERRAY}</p>
          </div>
        )}
      </div>
      <p className={styles.text}>{bingoPrize.nameJp}</p>
    </div>
  );
};

export default PrizeCard;
