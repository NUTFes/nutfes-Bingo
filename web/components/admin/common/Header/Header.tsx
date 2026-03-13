"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import styles from "./Header.module.css";

interface HeaderProps {
  children: ReactNode;
  user: string;
}

const Header = ({ children, user }: HeaderProps) => {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <button type="button" className={styles.titleButton} onClick={() => router.push("/admin")}>
          <div className={styles.title}>
            <p>NUTFES BINGO {user}</p>
          </div>
        </button>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Header;
