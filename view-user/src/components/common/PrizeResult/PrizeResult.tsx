import React, { useState, useEffect } from "react";
import styles from "./PrizeResult.module.css";
import Image from "next/image";
import { useRouter } from "next/router";
import { ja } from "@/locales/ja";
import { en } from "@/locales/en";
import { BingoPrize } from "@/pages/prizes";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [loadedImages, setLoadedImages] = useState(0);
  const totalImages = props.prizeResult.filter((prize) => prize.image).length;

  useEffect(() => {
    if (
      (loadedImages === totalImages && totalImages > 0) ||
      totalImages === 0
    ) {
      setIsImageVisible(true);
    }
  }, [loadedImages, totalImages]);

  const handleImageLoad = () => {
    setLoadedImages((prevCount) => prevCount + 1);
  };

  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <Image src="/GiftBox.svg" alt="GiftBox" width={19} height={19} />
          {t.SUB_TITLE_PRIZE}
        </div>
        {!isImageVisible && <div id="loading" className={styles.visible}></div>}
        {isImageVisible && (
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
                      onLoadingComplete={handleImageLoad}
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
        )}
      </div>
    </div>
  );
};

export default PrizeResult;
