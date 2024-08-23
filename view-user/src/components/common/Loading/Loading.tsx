import React from "react";
import styles from "./Loading.module.css";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const Loading = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.main}>
          <img className={styles.logo} src="./Bingo_logo.png" alt="sample" />
          <AiOutlineLoading3Quarters className={styles.loader} />
        </div>
      </div>
    </div>
  );
};

export default Loading;
