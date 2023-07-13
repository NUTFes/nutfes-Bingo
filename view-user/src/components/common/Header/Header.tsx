import React from "react";
import { ReactNode } from "react";
import styles from "./Header.module.css";
import LogoutButton from "@/components/common/LogoutButton";

interface HeaderProps {
  user: string;
}

export const Header = (props: HeaderProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <p>NUTFES BINGO {props.user}</p>
        <LogoutButton />
      </div>
    </div>
  );
};

export default Header;
