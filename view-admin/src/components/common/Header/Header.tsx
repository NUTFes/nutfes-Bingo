import React, { ReactNode } from "react";
import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";

interface HeaderProps {
  children: ReactNode;
  user: string;
}

const Header = ({ children, user }: HeaderProps) => {
  const router = useRouter();
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.title} onClick={() => router.push("/")}>
          <p>NUTFES  {user}</p>
        </div>
        <div><IoHelpCircleOutline /></div>
      </div>
    </div>
  );
};

export default Header;
