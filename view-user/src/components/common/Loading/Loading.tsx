import React, { ReactNode } from "react";
import styles from "./Loading.module.css";
import { useRouter } from "next/router";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const Loading = () => {
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <img className={styles.logo} src="./Bingo_logo.png" alt="sample" />
        <AiOutlineLoading3Quarters className={styles.icon} />
      </div>
    </div>
  );
};

export default Loading;
