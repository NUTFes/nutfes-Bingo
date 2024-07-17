import React, { useState, useEffect } from "react";
import styles from "./PrizeResult.module.css";
import Image from "next/image";
import { useRouter } from "next/router";
import { ja } from "@/locales/ja";
import { en } from "@/locales/en";
import { BingoPrize } from "@/type/common";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;

  const [hasValidData, setHasValidData] = useState(false);

  useEffect(() => {
    const validData = props.prizeResult.some(
      (prize) => prize.id !== 0 || prize.name !== "" || prize.image !== ""
    );

    if (validData) {
      setHasValidData(true);
    } else {
      const timer = setTimeout(() => {
        setHasValidData(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [props.prizeResult]);
  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };

  const bingoPrizes: BingoPrize[] = props.prizeResult;

  // imageURLs を string[] 型にするための修正
  const imageURLs: string[] = bingoPrizes.map((prize: BingoPrize) => {
    if (prize.prizeImage) {
      const image = prize.prizeImage;
      const bucketName = image.bucketName;
      const fileName = image.fileName;
      return `${process.env.NEXT_PUBLIC_MINIO_ENDPONT}/${bucketName}/${fileName}`;
    } else {
      return "";
    }
  });

  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <Image src="/GiftBox.svg" alt="GiftBox" width={19} height={19} />
          {t.SUB_TITLE_PRIZE}
        </div>
        {!hasValidData && <div id="loading" className={styles.visible}></div>}
        {hasValidData && (
          <div className={styles.card_frame}>
            {[...props.prizeResult]
              .sort((a, b) => a.id - b.id)
              .map((prizeResult) => (
                <div className={styles.card} key={prizeResult.id}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <Image
                      src={prizeResult.image}
                      className={styles.image}
                      alt="PrizeImage"
                      fill
                      style={{ objectFit: "cover" }}
                    />
        <div
          id="loading"
          className={isImageVisible ? styles.visible : styles.hidden}
        ></div>
        <div className={styles.card_frame}>
          {[...props.prizeResult]
            .sort((a, b) => a.id - b.id)
            .map((prizeResult, index) => (
              <div className={styles.card} key={prizeResult.id}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {/* <Image
                    src={prizeResult.image}
                    className={styles.image}
                    alt="PrizeImage"
                    fill
                    style={{ objectFit: "cover" }}
                    onLoadingComplete={imageVisibility}
                  /> */}
                  <img
                    src={imageURLs && imageURLs[index]}
                    className="image"
                    alt="PrizeImage"
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                    onLoad={imageVisibility}
                  />
                </div>
                <div
                  style={{ position: "relative" }}
                  className={styles.card_content}
                >
                  {prizeResult.nameJp}
                </div>
                {prizeResult.isWon && (
                  <div className={styles.overlay}>
                    <p>{t.WINNING_OVERRAY}</p>
                  </div>
                  <div
                    style={{ position: "relative" }}
                    className={styles.card_content}
                  >
                    {prizeResult.name}
                  </div>
                  {prizeResult.existing && (
                    <div className={styles.overlay}>
                      <p>{t.WINNING_OVERRAY}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizeResult;
