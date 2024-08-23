import React, { useState } from "react";
import styles from "./PrizeResult.module.css";
import Image from "next/image";
import { useMutation } from "@apollo/client";
import { UpdateOnePrizeIsWonDocument } from "@/type/graphql";
import type {
  UpdateOnePrizeIsWonMutation,
  UpdateOnePrizeIsWonMutationVariables,
  GetListPrizesQuery,
} from "@/type/graphql";

interface PrizeResultProps {
  prizeResult: GetListPrizesQuery["prizes"];
  // prettier-ignore
  setBingoPrize: React.Dispatch<React.SetStateAction<GetListPrizesQuery["prizes"]>>;
  showOverlay: boolean;
  showToggle: boolean;
}

export const PrizeResult = (props: PrizeResultProps) => {
  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };

  // prettier-ignore
  const [updatePrize] = useMutation<UpdateOnePrizeIsWonMutation, UpdateOnePrizeIsWonMutationVariables>(UpdateOnePrizeIsWonDocument);

  // TODO ENDPONT のスペリングミスを修正
  // imageURLs を string[] 型にするための修正
  const imageURLs: string[] = props.prizeResult.map((prize) => {
    if (prize.image) {
      const { bucketName, fileName } = prize.image;
      console.log(prize.image.bucketName);
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
