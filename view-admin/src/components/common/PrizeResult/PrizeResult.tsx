import React from "react";
import { ReactNode, useState } from "react";
import styles from "./PrizeResult.module.css";
import { BingoPrize, updatePrizeExisting } from "@/utils/api_methods";
import Image from "next/image";


interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>景品一覧</div>
        <div id="loading" className={isImageVisible ? styles.visible : styles.hidden}></div>
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
                    <p>当選！</p>
                  </div>
                )}
                <div className={styles.toggle_container}>
                  <div className={styles.toggle_button}>
                    <input
                      id="toggle"
                      className={styles.toggle_input}
                      type="checkbox"
                      checked={prizeResult.existing}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        console.log(prizeResult.id, e.target.checked);
                        updatePrizeExisting(prizeResult.id, e.target.checked);
                      }}
                    />
                    <label htmlFor="toggle" className={styles.toggle_label} />
                </div>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PrizeResult;
