import Image from "next/image";
import styles from "./Loading.module.css";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useEffect, useState } from "react";
import BingoLogo from "public/logo_bingo.svg";

const Loading = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <BingoLogo className={styles.logo} />
        <AiOutlineLoading3Quarters className={styles.loader} />
      </div>
    </div>
  );
};

export default Loading;
