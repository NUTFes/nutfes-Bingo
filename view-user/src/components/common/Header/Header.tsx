import styles from "./Header.module.css";
import { useRouter } from "next/router";
import Image from "next/image";
import { IoHelpCircleOutline } from "react-icons/io5";
import { Help } from "@/components";
import React, { useState, useEffect } from "react";

const Header = () => {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const isHelpShown = localStorage.getItem("helpShown");

    if (isHelpShown === null) {
      setIsHelpOpen(true);
      localStorage.setItem("helpShown", JSON.stringify(true));
    }
  }, []);

  useEffect(() => {
    console.log("ヘルプ表示状態: ", isHelpOpen);
  }, [isHelpOpen]);

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
