import React from "react";
import { ReactNode } from "react";
import styles from "./PrizeResult.module.css";
import { BingoPrize } from "@/utils/api_methods";
import Image from "next/image";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>抽選済み番号一覧</div>
          {[...props.prizeResult].reverse().map((prizeResult, index) => (
            <div className={styles.card_frame} key={index}>
              <Image
                src={prizeResult.image}
                alt="PrizeImage"
                width={50}
                height={50}
                sizes="100vw"
              />
              <p>{prizeResult.name}</p>
              <p>{prizeResult.existing}</p>
            </div>
          ))}
        </div>
      </div>
  );
};

export default PrizeResult;
