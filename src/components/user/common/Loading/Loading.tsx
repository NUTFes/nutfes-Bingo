"use client";

import styles from "./Loading.module.css";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import Image from "next/image";

const Loading = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <Image
          src="/logo_bingo.svg"
          alt="Bingo Logo"
          width={240}
          height={90}
          className={styles.logo}
        />
        <AiOutlineLoading3Quarters className={styles.loader} />
      </div>
    </div>
  );
};

export default Loading;
