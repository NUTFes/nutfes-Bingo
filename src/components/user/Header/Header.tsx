import type { DriveStep, Driver } from "driver.js";
import { CircleHelp } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { useBingoLanguage } from "@/utils/i18n/provider";
import styles from "./Header.module.css";

const Header = () => {
  const pathname = window.location.pathname;
  const { t } = useBingoLanguage();
  const driverRef = useRef<Driver | null>(null);
  const isLoadingTourRef = useRef(false);

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

  const startTour = useCallback(async () => {
    if (isLoadingTourRef.current) return;
    const steps = buildSteps();
    if (steps.length === 0) return;

    isLoadingTourRef.current = true;
    try {
      const [{ driver }] = await Promise.all([import("driver.js"), import("./help-tour.css")]);
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
    } catch (error) {
      console.error("ヘルプの読み込みに失敗しました。", error);
    } finally {
      isLoadingTourRef.current = false;
    }
  }, [buildSteps, t]);

  useEffect(() => {
    const driver = driverRef.current;
    return () => {
      driver?.destroy();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <a className={styles.title} href="/" aria-label="nutfes-Bingo">
          nutfes-Bingo
        </a>
        <button
          type="button"
          className={styles.icon}
          onClick={() => void startTour()}
          aria-label={t.helpCarousel.open}
          title={t.helpCarousel.open}
        >
          <CircleHelp />
        </button>
      </div>
    </div>
  );
};

export default Header;
