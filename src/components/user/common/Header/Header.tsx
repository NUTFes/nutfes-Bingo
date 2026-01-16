"use client";

import introJs from "intro.js";
import styles from "./Header.module.css";
import { useRouter, usePathname } from "next/navigation";
import { IoHelpCircleOutline } from "react-icons/io5";
import { useEffect, useCallback } from "react";
import Image from "next/image";
import { ja, en } from "@/locales";
import { useUserStore } from "@/stores/useUserStore";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const language = useUserStore((state) => state.language);
  const t = language === "ja" ? ja : en;

  const startTour = useCallback(() => {
    const intro = introJs();
    intro.onbeforechange(() => {
      document.body.style.overflow = "hidden";
      return true;
    });
    intro.oncomplete(() => {
      document.body.style.overflow = "";
    });

    const isPrizePage = pathname === "/prizes";

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
  }, [pathname, t]);

  useEffect(() => {
    const isHelpShown = localStorage.getItem("isStartIntrojs");
    if (isHelpShown === null) {
      localStorage.setItem("isStartIntrojs", JSON.stringify(true));
      startTour();
    }
  }, [startTour]);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Image
          src="/logo_bingo.svg"
          alt="Bingo Logo"
          width={220}
          height={80}
          className={styles.logo}
          onClick={() => router.push("/")}
          priority
        />
        <button className={styles.icon} onClick={startTour}>
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
