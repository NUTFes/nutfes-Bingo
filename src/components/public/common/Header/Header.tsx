"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { IoHelpCircleOutline } from "react-icons/io5";
import { useEffect } from "react";

import { useBingoLanguage } from "@/lib/i18n/provider";
import styles from "./Header.module.css";

const HELP_SHOWN_KEY = "isStartIntrojs";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useBingoLanguage();

  const startTour = async () => {
    const { default: introJs } = await import("intro.js");
    const intro = introJs();
    const isPrizePage = pathname === "/prizes";

    intro.onbeforechange(() => {
      document.body.style.overflow = "hidden";
      return true;
    });

    intro.oncomplete(() => {
      document.body.style.overflow = "";
    });

    intro.onexit(() => {
      document.body.style.overflow = "";
    });

    intro.setOptions({
      steps: [
        {
          title: t.helpDescription.page1_title,
          intro: t.helpDescription.page1_txt,
          position: "floating",
        },
        {
          title: isPrizePage ? t.helpDescription.page2_title_back : t.helpDescription.page2_title,
          intro: isPrizePage ? t.helpDescription.page2_txt_back : t.helpDescription.page2_txt,
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

  useEffect(() => {
    const isHelpShown = window.localStorage.getItem(HELP_SHOWN_KEY);
    if (isHelpShown === null) {
      window.localStorage.setItem(HELP_SHOWN_KEY, JSON.stringify(true));
      void startTour();
    }
  }, [startTour]);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <button type="button" className={styles.logoButton} onClick={() => router.push("/")}>
          <Image
            src="/logo_bingo.svg"
            alt="NUTFes Bingo"
            width={180}
            height={80}
            className={styles.logo}
            priority
          />
        </button>
        <button
          type="button"
          className={styles.icon}
          onClick={() => void startTour()}
          aria-label="help"
        >
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
