import React, { useState } from "react";
import styles from "./ReachIcon.module.css";
import classNames from "classnames";
import { StyleRegistry } from "styled-jsx";

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
      <img
        src={colorInversion ? "/reach-icon-inversion.svg" : "/reach-icon.svg"}
        alt="Reach Icon"
        className={styles.icon}
      />
      <span className={styles.text}>REACH</span>
    </button>
  );
};

export default ReachIcon;
