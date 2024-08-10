import React, { ReactNode } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";

// ボタンの動作確認用の関数（後でヘルプに飛ぶようにする）
const goHelpe = function () {
  console.log("1");
};

const Header = () => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <img
          className={styles.logo}
          src="./Bingo_logo.png"
          alt="sample"
          onClick={() => router.push("/")}
        />
        <button className={styles.icon} onClick={goHelpe}>
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
