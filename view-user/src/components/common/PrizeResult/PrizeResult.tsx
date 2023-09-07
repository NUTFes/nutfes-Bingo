import React from "react";
import { ReactNode, useState } from "react";
import styles from "./PrizeResult.module.css";
import { BingoPrize, updatePrizeExisting } from "@/utils/api_methods";
import Image from "next/image";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>
          <Image src="/GiftBox.svg" alt="GiftBox" width={19} height={19} />
          Prize List
        </div>
        <div id="loading" className={isVisible ? styles.visible : styles.hidden}></div>
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
                    onLoad={toggleVisibility}
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
                    <p>当選！</p>
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
