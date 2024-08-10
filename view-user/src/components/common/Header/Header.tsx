import React, { ReactNode } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";

const Header = () => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <img
          className={styles.logo}
          src="./Bingo_logo.png"
          alt="sample"
          onClick={func}
        />
        <button className={styles.icon}>
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

// オンクリックの動作確認用の関数（後でヘルプに飛ぶようにする）
var func = function () {
  console.log("1");
};

export default Header;
