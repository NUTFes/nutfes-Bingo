"use client";

import { driver, type DriveStep, type Driver } from "driver.js";
import { usePathname, useRouter } from "next/navigation";
import { IoHelpCircleOutline } from "react-icons/io5";
import { useCallback, useEffect, useRef } from "react";

import { useBingoLanguage } from "@/lib/i18n/provider";
import styles from "./Header.module.css";

const HELP_SHOWN_KEY = "isHelpTourShown";
const LEGACY_HELP_SHOWN_KEY = "isStartIntrojs";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { t } = useBingoLanguage();
  const driverRef = useRef<Driver | null>(null);

  const buildSteps = useCallback((): DriveStep[] => {
    const isPrizePage = pathname === "/prizes";

    const steps: DriveStep[] = [
      {
        popover: {
          title: t.helpDescription.page1_title,
          description: t.helpDescription.page1_txt,
          side: "over",
          align: "center",
        },
      },
      {
        element: isPrizePage ? "#BackIcon" : "#PrizesIcon",
        popover: {
          title: isPrizePage ? t.helpDescription.page2_title_back : t.helpDescription.page2_title,
          description: isPrizePage ? t.helpDescription.page2_txt_back : t.helpDescription.page2_txt,
          side: "top",
          align: "center",
        },
      },
      {
        element: "#ReactionsIcon",
        popover: {
          title: t.helpDescription.page3_title,
          description: t.helpDescription.page3_txt,
          side: "top",
          align: "center",
        },
      },
      {
        element: "#ReachIcon",
        popover: {
          title: t.helpDescription.page4_title,
          description: t.helpDescription.page4_txt,
          side: "top",
          align: "center",
        },
      },
      {
        element: "#SettingsIcon",
        popover: {
          title: t.helpDescription.page5_title,
          description: t.helpDescription.page5_txt,
          side: "top",
          align: "center",
        },
      },
    ];

    return steps.filter((step) => {
      if (!step.element) return true;
      if (typeof step.element === "string") return document.querySelector(step.element) !== null;
      if (typeof step.element === "function") return Boolean(step.element());
      return Boolean(step.element);
    });
  }, [pathname, t]);

  const startTour = useCallback(() => {
    const steps = buildSteps();
    if (steps.length === 0) return;

    driverRef.current?.destroy();
    const instance = driver({
      steps,
      showProgress: true,
      progressText: t.helpCarousel.progress,
      showButtons: ["previous", "next"],
      nextBtnText: t.helpCarousel.next,
      prevBtnText: t.helpCarousel.back,
      doneBtnText: t.helpCarousel.close,
      popoverClass: "help-tour-popover",
      overlayColor: "#000",
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 12,
      allowClose: true,
      overlayClickBehavior: "close",
      smoothScroll: false,
      disableActiveInteraction: true,
    });

    driverRef.current = instance;
    instance.drive();
  }, [buildSteps, t]);

  useEffect(() => {
    const isHelpShown =
      window.localStorage.getItem(HELP_SHOWN_KEY) ??
      window.localStorage.getItem(LEGACY_HELP_SHOWN_KEY);
    if (isHelpShown === null) {
      window.localStorage.setItem(HELP_SHOWN_KEY, JSON.stringify(true));
      startTour();
    }
  }, [startTour]);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <button
          type="button"
          className={styles.title}
          onClick={() => router.push("/")}
          aria-label="nutfes-Bingo"
        >
          nutfes-Bingo
        </button>
        <button
          type="button"
          className={styles.icon}
          onClick={startTour}
          aria-label={t.helpCarousel.open}
          title={t.helpCarousel.open}
        >
          <IoHelpCircleOutline />
        </button>
      </div>
    </div>
  );
};

export default Header;
