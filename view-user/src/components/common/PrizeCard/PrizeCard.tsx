import React from "react";
import styles from "./PrizeCard.module.css";
import type { GetListPrizesQuery } from "@/type/graphql";
import { useRouter } from "next/router";
import classNames from "classnames";
import { en, ja } from "@/locales";
import Image from "next/image";

interface PrizeCardProps {
  BingoPrize: GetListPrizesQuery["prizes"][number];
}

const PrizeCard = (props: PrizeCardProps) => {
  // TODO lacaleでnameJpとnameEnの切り替えを実装する。
  // nameEnがない場合はnameJpを表示
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;

  const bingoPrize = props.BingoPrize;
  const prizeImage = bingoPrize.image;

  const imageURL: string = prizeImage
    ? `${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}/${prizeImage.bucketName}/${prizeImage.fileName}`
    : "";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.image}>
          <div className={styles.imageWrapper}>
            <Image src={imageURL} alt="PrizeImage" layout="fill" />
          </div>
        </div>
        {bingoPrize.isWon && (
          <div className={classNames(styles.overlay, styles.center)}>
            <p className={styles.center}>当選済み</p>
          </div>
        )}
      </div>
      <p className={styles.text}>{bingoPrize.nameJp}</p>
    </div>
  );
};

export default PrizeCard;
