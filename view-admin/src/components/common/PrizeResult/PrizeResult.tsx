import React from "react";
import { ReactNode } from "react";
import styles from "./PrizeResult.module.css";
import { BingoPrize, updatePrizeExisting } from "@/utils/api_methods";
import Image from "next/image";


interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

export const PrizeResult = (props: PrizeResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>景品一覧</div>
        <div className={styles.card_frame}>
          {[...props.prizeResult]
            .sort((a, b) => a.id - b.id)
            .map((prizeResult) => (
              <div className={prizeResult.existing? styles.card_overlay : styles.card} key={prizeResult.id}>
                <div style={{position:"relative", width:"100%", height:"100%"}}>
                  <Image
                    src={prizeResult.image}
                    alt="PrizeImage"
                    fill
                  />
                  <p>{prizeResult.existing? "当選" : ""}</p>
                </div>
                <div style={{position:"relative"}} className={styles.card_content}>
                  {prizeResult.name}
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
