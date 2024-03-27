import React from "react";
import { ReactNode, useState } from "react";
import styles from "./PrizeResult.module.css";
import Image from "next/image";
import { useRouter } from "next/router";
import { ja } from "@/pages/locales/ja";
import { en } from "@/pages/locales/en";
import { BingoPrize } from "@/pages/prizes";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <Image src="/GiftBox.svg" alt="GiftBox" width={19} height={19} />
          {t.SUB_TITLE_PRIZE}
        </div>
        <div
          id="loading"
          className={isImageVisible ? styles.visible : styles.hidden}
        ></div>
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
                    onLoadingComplete={imageVisibility}
                  />
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
      </div>
    </div>
  );
};

export default PrizeResult;
