import React, { ReactNode } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";

const Header = () => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <img className={styles.logo} src="./Bingo_logo.png" alt="sample" />
        <button className={styles.icon}>
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
