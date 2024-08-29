import React, { useState, useEffect } from "react";
import styles from "./PrizeResult.module.css";
import Image from "next/image";
import { useRouter } from "next/router";
import { ja, en } from "@/locales";
import { GetListPrizesQuery } from "@/type/graphql";

interface PrizeResultProps {
  prizeResult: GetListPrizesQuery["prizes"];
}

export const PrizeResult = (props: PrizeResultProps) => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;

  const [hasValidData, setHasValidData] = useState(false);
  const bingoPrizes: GetListPrizesQuery["prizes"] = props.prizeResult;

  useEffect(() => {
    const validData = bingoPrizes.some(
      (prize) => prize.id !== 0 || prize.nameJp !== "",
    );

    if (validData) {
      setHasValidData(true);
    } else {
      const timer = setTimeout(() => {
        setHasValidData(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [bingoPrizes]);

  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };

  // imageURLs を string[] 型にするための修正
  const imageURLs: string[] = [...bingoPrizes]
    .sort((a, b) => a.id - b.id)
    .map((prize: GetListPrizesQuery["prizes"][number]) => {
      if (prize.image) {
        const { bucketName, fileName } = prize.image;
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
        </div>
        {!hasValidData && <div id="loading" className={styles.visible}></div>}
        {hasValidData && (
          <>
            <div
              id="loading"
              className={isImageVisible ? styles.visible : styles.hidden}
            ></div>
            <div className={styles.card_frame}>
              {[...bingoPrizes]
                .sort((a, b) => a.id - b.id)
                .map((prize, index) => (
                  <div className={styles.card} key={prize.id}>
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
                      {prize.nameJp}
                    </div>
                    {prize.isWon && (
                      <div className={styles.overlay}>
                        <p></p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrizeResult;
