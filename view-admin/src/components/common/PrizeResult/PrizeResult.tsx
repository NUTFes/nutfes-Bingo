import React, { useState } from "react";
import styles from "./PrizeResult.module.css";
import { BingoPrize} from "@/type/common";
import Image from "next/image";
import { useMutation } from "@apollo/client";
import { bingoPrizeUpdateIsWon as BPUIW } from "@/pages/api/schema";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
  setBingoPrize: React.Dispatch<React.SetStateAction<BingoPrize[]>>;
  showOverlay: boolean;
  showToggle: boolean;
}

export const PrizeResult = (props: PrizeResultProps) => {
  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };

  const [updatePrize] = useMutation(BPUIW);
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

  const handleToggleChange = (id: number, isWon: boolean) => {
    updatePrize({ variables: { id: id, isWon: isWon } });
    props.setBingoPrize((prev) =>
      prev.map((prize) =>
        prize.id === id ? { ...prize, isWon: isWon } : prize,
      ),
    );
  };

  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>景品一覧</div>
        <div
          id="loading"
          className={isImageVisible ? styles.visible : styles.hidden}
        ></div>
        <div className={styles.card_frame}>
          {[...props.prizeResult]
            .sort((a, b) => a.id - b.id)
            .map((prizeResult, index) => (
              <div
                className={styles.card}
                key={prizeResult.id}
                id={`prize-${prizeResult.id}`}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {/* <Image
                    src={imageURLs && imageURLs[index]}
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
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    onLoad={imageVisibility}
                  />
                </div>
                <div className={styles.card_content}>
                  <p>{prizeResult.nameJp}</p>
                </div>
                {props.showOverlay && prizeResult.isWon && (
                  <div className={styles.overlay}>
                    <p>当選！</p>
                  </div>
                )}
                {props.showToggle && (
                  <div className={styles.toggle_container}>
                    <div className={styles.toggle_button}>
                      <input
                        id="toggle"
                        className={styles.toggle_input}
                        type="checkbox"
                        checked={prizeResult.isWon}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleToggleChange(prizeResult.id, e.target.checked)
                        }
                      />
                      <label htmlFor="toggle" className={styles.toggle_label} />
                    </div>
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
