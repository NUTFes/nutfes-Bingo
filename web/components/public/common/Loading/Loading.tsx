import Image from "next/image";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

import styles from "./Loading.module.css";

const Loading = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <Image
          src="/logo_bingo.svg"
          alt="NUTFes Bingo"
          width={200}
          height={96}
          className={styles.logo}
          priority
        />
        <AiOutlineLoading3Quarters className={styles.loader} />
      </div>
    </div>
  );
};

export default Loading;
