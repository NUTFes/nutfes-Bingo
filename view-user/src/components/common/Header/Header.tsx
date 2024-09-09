import styles from "./Header.module.css";
import { useRouter } from "next/router";
import Image from "next/image";
import { IoHelpCircleOutline } from "react-icons/io5";
import { HelpCarousel } from "@/components";
import { useState, useEffect } from "react";

const Header = () => {
  const router = useRouter();
  const [isOpenHelpCarousel, setIsOpenHelpCarousel] = useState(false);

  useEffect(() => {
    const isHelpShown = localStorage.getItem("isOpenHelpCarousel");

    if (isHelpShown === null) {
      setIsOpenHelpCarousel(true);
      localStorage.setItem("isOpenHelpCarousel", JSON.stringify(true));
    }
  }, []);

  const handleClick = () => {
    setIsOpenHelpCarousel(true);
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
        <button className={styles.icon} onClick={handleClick}>
          <IoHelpCircleOutline />
        </button>
      </div>
      {isOpenHelpCarousel && (
        <HelpCarousel
          isOpened={isOpenHelpCarousel}
          setIsOpened={setIsOpenHelpCarousel}
        />
      )}
    </div>
  );
};

export default Header;
