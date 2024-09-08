import styles from "./Header.module.css";
import { useRouter } from "next/router";
import Image from "next/image";
import { IoHelpCircleOutline } from "react-icons/io5";
import { Help } from "@/components";
import React, { useState } from "react";

const Header = () => {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const goHelp = () => {
    setIsHelpOpen(true);
  };
  const closeHelp = () => {
    setIsHelpOpen(!isHelpOpen);
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Image
          className={styles.logo}
          src="/Bingo_logo.png"
          alt="sample"
          width={300}
          height={300}
          onClick={() => router.push("/")}
        />
        <button className={styles.icon} onClick={goHelp}>
          <IoHelpCircleOutline />
        </button>
      </div>
      {isHelpOpen && <Help isOpened={isHelpOpen} setIsOpened={setIsHelpOpen} />}
    </div>
  );
};

export default Header;
