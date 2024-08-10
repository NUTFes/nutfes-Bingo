import React, { ReactNode } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";
import Bingo_logo from "./Bingo_logo.png"

interface HeaderProps {
  children: ReactNode;
  user: string;
}

const Header = () => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <img className={styles.logo} src={Bingo_logo.src} alt="sample" />
        <div className={styles.icon}><IoHelpCircleOutline /></div>
      </div>
    </div>
  );
};

export default Header;
