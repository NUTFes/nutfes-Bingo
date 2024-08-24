import React from "react";
import styles from "./Loading.module.css";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const Loading = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <img className={styles.logo} src="./Bingo_logo.png" alt="logo" />
        <AiOutlineLoading3Quarters className={styles.loader} />
      </div>
    </div>
  );
};

export default Loading;
