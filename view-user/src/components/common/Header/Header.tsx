import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";
import { HelpCarousel } from "@/components";
import { useState, useEffect } from "react";
import BingoLogo from "public/logo_bingo.svg";

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
        <BingoLogo className={styles.logo} onClick={() => router.push("/")} />
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
