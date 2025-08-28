import introJs from "intro.js";
import styles from "./Header.module.css";
import { useRouter } from "next/router";
import { IoHelpCircleOutline } from "react-icons/io5";
import { useState, useEffect } from "react";
import BingoLogo from "public/logo_bingo.svg";
import { ja, en } from "@/locales";

const Header = () => {
  const router = useRouter();
  const { locale } = useRouter();
  const [] = useState<string>(locale || "ja");
  const t = locale === "ja" ? ja : en;

  const [isStartIntrojs, setIsStartIntrojs] = useState(false);
  useEffect(() => {
    const isHelpShown = localStorage.getItem("isStartIntrojs");
    if (isHelpShown === null) {
      setIsStartIntrojs(true);
      localStorage.setItem("isStartIntrojs", JSON.stringify(true));
      startTour();
    }
  }, []);

  const startTour = () => {
    const intro = introJs();
    intro.onbeforechange(() => {
      document.body.style.overflow = "hidden";
      return true;
    });
    intro.oncomplete(() => {
      document.body.style.overflow = "";
    });

    const isPrizePage = router.pathname === "/prizes";

    intro.setOptions({
      steps: [
        {
          title: t.helpDescription.page1_title,
          intro: t.helpDescription.page1_txt,
          position: "floating",
        },
        {
          title: isPrizePage
            ? t.helpDescription.page2_title_back
            : t.helpDescription.page2_title,
          intro: isPrizePage
            ? t.helpDescription.page2_txt_back
            : t.helpDescription.page2_txt,
          element: isPrizePage ? "#BackIcon" : "#PrizesIcon",
          position: "bottom-middle-aligned",
        },
        {
          title: t.helpDescription.page3_title,
          intro: t.helpDescription.page3_txt,
          element: "#ReactionsIcon",
          position: "bottom-middle-aligned",
        },
        {
          title: t.helpDescription.page4_title,
          intro: t.helpDescription.page4_txt,
          element: "#ReachIcon",
          position: "bottom-middle-aligned",
        },
        {
          title: t.helpDescription.page5_title,
          intro: t.helpDescription.page5_txt,
          element: "#SettingsIcon",
          position: "bottom-middle-aligned",
        },
      ],
      tooltipClass: styles.customTooltip,
      scrollToElement: false,
      hidePrev: true,
      showBullets: true,
      nextLabel: t.helpDescription.next,
      prevLabel: t.helpDescription.back,
      doneLabel: t.helpDescription.close,
    });
    intro.start();
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <BingoLogo className={styles.logo} onClick={() => router.push("/")} />
        <button className={styles.icon} onClick={startTour}>
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
