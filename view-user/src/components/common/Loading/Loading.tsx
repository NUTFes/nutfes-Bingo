import Image from "next/image";
import styles from "./Loading.module.css";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const Loading = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Image src="/Bingo_logo.png" alt="logo" fill objectFit="contain" />
        </div>
        <AiOutlineLoading3Quarters className={styles.loader} />
      </div>
    </div>
  );
};

export default Loading;
