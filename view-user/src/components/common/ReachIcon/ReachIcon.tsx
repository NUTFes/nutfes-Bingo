import React, { useState } from "react";
import styles from "./ReachIcon.module.css";
import classNames from "classnames";
import Image from "next/image";

const ReachIcon = () => {
  const [colorInversion, setColorInversion] = useState<boolean>(false);
  const handleClick = () => {
    setColorInversion(!colorInversion);
    //TODO 後でモーダルの開閉を追加する
  };
  return (
    <button
      className={classNames(styles.reachIcon, {
        [styles.color_inversion]: colorInversion,
      })}
      onClick={handleClick}
    >
      <div className={styles.icon}>
        <Image
          src={colorInversion ? "/reach-icon-inversion.svg" : "/reach-icon.svg"}
          alt="Reach Icon"
          layout="fill"
        />
      </div>
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
