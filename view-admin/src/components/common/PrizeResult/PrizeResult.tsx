import React from "react";
import { ReactNode } from "react";
import styles from "./PrizeResult.module.css";
import { BingoPrize, updatePrizeExisting } from "@/utils/api_methods";
import Image from "next/image";

interface PrizeResultProps {
  prizeResult: BingoPrize[];
}

const handleChangeCheckbox = (
  id: number,
  event: React.ChangeEvent<HTMLInputElement>
) => {
  console.log(id, event.target.checked);
};

export const PrizeResult = (props: PrizeResultProps) => {
  return (
    <div className={styles.content_wrapper}>
      <div className={styles.container}>
        <div className={styles.frame_title}>景品一覧</div>
        <div className={styles.card_frame}>
          {[...props.prizeResult]
            .sort((a, b) => a.id - b.id)
            .map((prizeResult) => (
              <div className={styles.card} key={prizeResult.id}>
                <div className={styles.card_img}>
                  <Image
                    src={prizeResult.image}
                    alt="PrizeImage"
                    fill
                    sizes="1vh"
                    className={styles.img}
                    // width={auto}
                    // height={200}
                  />
                </div>
                <div className={styles.card_content}>
                  <p>{prizeResult.name}</p>
                  {/* <div className={styles.toggle_button}> */}
                  <input
                    id="toggle"
                    // className={styles.toggle_input}
                    type="checkbox"
                    checked={prizeResult.existing}
                    onClick={(e) => {
                      // handleChangeCheckbox(prizeResult.id, e)
                      console.log(prizeResult.id, e.target.checked);
                      updatePrizeExisting(prizeResult.id, e.target.checked);
                    }}
                  />
                  {/* <label htmlFor="toggle" className={styles.toggle_label} /> */}
                </div>
              </div>
              // </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PrizeResult;
