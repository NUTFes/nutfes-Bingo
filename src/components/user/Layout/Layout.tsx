"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import styles from "./Layout.module.css";
import {
  ReachIcon,
  PrizesIcon,
  BackIcon,
  ReactionsIcon,
  SettingsIcon,
  ReactionStampModal,
  NavigationBar,
  Header,
  Button,
  Modal,
  ToggleButton,
  SurveyPromptModal,
} from "@/components/user/common";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logRealtimeChannelError } from "@/lib/supabase/realtime";
import { type Event, mapEventRow } from "@/types";
import { en, ja } from "@/locales";
import { useSurveyState } from "@/hooks/useSurveyState";
import { useUserStore } from "@/stores/useUserStore";

const images = [
  { name: "crap", src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { name: "good", src: "/ReactionIcon/good.png", alt: " good icon" },
  { name: "cracker", src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { name: "heart", src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { name: "smile", src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { name: "angry", src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { name: "skull", src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { name: "sad", src: "/ReactionIcon/sad.png", alt: "sad icon" },
];

const COLOR_PRESETS = {
  MAIN_COLORS: [
    "#FF6900",
    "#FCB900",
    "#7BDCB5",
    "#00D084",
    "#8ED1FC",
    "#0693E3",
    "#333333",
    "#EB144C",
    "#F78DA7",
    "#9900EF",
  ],
  SUB_COLORS: [
    "#FFD9BE",
    "#FDECBD",
    "#C2EFDD",
    "#C3F5E3",
    "#DBF0FE",
    "#C0E4F8",
    "#B1B1B1",
    "#FDECF0",
    "#FCDBE3",
    "#E4BBFA",
  ],
  DEFAULT_MAIN_COLOR: "#FFD607",
  DEFAULT_SUB_COLOR: "#FFF8DC",
};

interface LayoutProps {
  children: React.ReactNode;
  pageName: string;
  isSortedAscending?: boolean;
  setIsSortedAscending?: (value: boolean) => void;
}

const supabase = createSupabaseBrowserClient();

const Layout = (props: LayoutProps) => {
  const language = useUserStore((state) => state.language);
  const setLanguage = useUserStore((state) => state.setLanguage);
  const t = language === "ja" ? ja : en;

  const [isReactionModalOpen, setIsReactionModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const hasShownSurvey = useUserStore((state) => state.hasShownSurvey);
  const setHasShownSurvey = useUserStore((state) => state.setHasShownSurvey);

  const [isSortOrderActive, setIsSortOrderActive] = useState<boolean>(false);
  const { setIsSortedAscending } = props;

  const [isReachModalOpen, setIsReachModalOpen] = useState<boolean>(false);
  const [isReachIconVisible, setReachIconVisible] = useState<boolean>(true);

  const [mainColor] = useState(COLOR_PRESETS.DEFAULT_MAIN_COLOR);
  const [subColor] = useState(COLOR_PRESETS.DEFAULT_SUB_COLOR);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [navBarHeight, setNavBarHeight] = useState<string>();
  const navRef = useRef<HTMLDivElement>(null);
  const position: string = isReachIconVisible ? "29%" : "50%";
  // スタンプ送信中フラグ（クールダウン中の連打防止）
  const [isStampSending, setIsStampSending] = useState<boolean>(false);
  // 直近に押したスタンプ名（押下中エフェクトの対象）
  const [activeStampName, setActiveStampName] = useState<string | null>(null);
  const [latestEvent, setLatestEvent] = useState<Event | null>(null);

  // ナビゲーションバーの高さを設定
  useLayoutEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      setNavBarHeight(navHeight.toString());
    }
  }, []);

  // localStorageから状態を読み込む
  useEffect(() => {
    const storedVisibility = localStorage.getItem("isReachIconVisible");
    if (storedVisibility !== null) {
      setReachIconVisible(storedVisibility === "true");
    }

    const storedSortOrder = localStorage.getItem("isSortedAscending");
    if (storedSortOrder !== null) {
      const isSortedAscending = storedSortOrder === "true";
      setIsSortedAscending?.(isSortedAscending);
      setIsSortOrderActive(isSortedAscending);
    } else {
      localStorage.setItem("isSortedAscending", "false");
    }
  }, [setIsSortedAscending]);

  // テーマ初期化
  useEffect(() => {
    const root = document.documentElement;
    const legacyDarkMode = localStorage.getItem("isDarkMode");
    if (legacyDarkMode !== null) {
      const legacyIsDark = legacyDarkMode === "true";
      const nextTheme = legacyIsDark ? "dark" : "light";
      root.dataset.theme = nextTheme;
      setIsDarkMode(legacyIsDark);
      document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
      localStorage.removeItem("isDarkMode");
      return;
    }

    const theme = root.dataset.theme;
    if (theme === "dark" || theme === "light") {
      setIsDarkMode(theme === "dark");
    }
  }, []);

  // 初期設定を適用
  useEffect(() => {
    // ソート順を親コンポーネントに伝える
    setIsSortedAscending?.(isSortOrderActive);

    // カラーを適用
    document.documentElement.style.setProperty("--main-color", mainColor);
    document.documentElement.style.setProperty("--sub-color", subColor);
  }, [isSortOrderActive, mainColor, subColor, setIsSortedAscending]);

  // 背景色やテーマカラーを適用
  useEffect(() => {
    const theme = isDarkMode ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (metaTheme) {
      const computedBackground = getComputedStyle(root)
        .getPropertyValue("--background-color")
        .trim();
      metaTheme.content = computedBackground || (isDarkMode ? "#2C252F" : "#FFFFFF");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchLatestEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, survey_url, is_survey_active")
        .order("id", { ascending: false })
        .limit(1);
      if (!error && data && data[0]) {
        setLatestEvent(mapEventRow(data[0]));
      }
    };

    fetchLatestEvent();

    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        const row = payload.new as {
          id: number;
          survey_url: string;
          is_survey_active: boolean;
        };
        if (row) setLatestEvent(mapEventRow(row));
      })
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          logRealtimeChannelError("events", err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleDarkMode = () => {
    const nextTheme = isDarkMode ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
    setIsDarkMode(nextTheme === "dark");
  };

  // アンケート状態管理（カスタムフック）
  const { surveyUrl, isSurveyModalOpen, setIsSurveyModalOpen, isSurveyActive } = useSurveyState(
    latestEvent,
    hasShownSurvey,
    setHasShownSurvey,
  );

  // スタンプ押下時の送信処理（短いクールダウンで二重送信を防止）
  const handleReactionClick = async (name: string) => {
    if (isStampSending) return;
    setActiveStampName(name);
    setIsStampSending(true);
    const { error } = await supabase.from("stamp_triggers").insert({ name });
    if (error) {
      console.error("Failed to send stamp:", error);
    }
    // 押下アニメの体感時間に合わせて解除（約0.8秒）
    setTimeout(() => {
      setIsStampSending(false);
      setActiveStampName(null);
    }, 800);
  };

  // 設定内のアンケート回答ボタンの処理
  const handleAnswerSurvey = () => {
    if (surveyUrl) window.open(surveyUrl, "_blank", "noopener,noreferrer");
  };

  // リーチアイコンがクリックされたときの処理
  const handleReachIconClick = async () => {
    try {
      const { data, error } = await supabase
        .from("reach_logs")
        .select("reach_num")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const latestReachLogNumber = data?.[0]?.reach_num || 0;
      const { error: insertError } = await supabase
        .from("reach_logs")
        .insert({ status: true, reach_num: latestReachLogNumber + 1 });
      if (insertError) throw insertError;

      setReachIconVisible(false);
      localStorage.setItem("isReachIconVisible", "false");
      setIsReachModalOpen(!isReachModalOpen);
    } catch (error) {
      console.error("Failed to record reach:", error);
    }
  };

  const toggleSortOrder = () => {
    if (props.setIsSortedAscending) {
      const newSortOrder = !props.isSortedAscending;
      localStorage.setItem("isSortedAscending", newSortOrder.toString());
      props.setIsSortedAscending(newSortOrder);
      setIsSortOrderActive(newSortOrder);
    }
  };

  const toggleLanguage = () => {
    const newLocale = language === "ja" ? "en" : "ja";
    setLanguage(newLocale);
  };

  const icons = (pageName: string) => {
    let icons = [];
    const commonIcons = [
      <ReactionsIcon
        isOpen={isReactionModalOpen}
        setIsReactionModalOpen={setIsReactionModalOpen}
        key="reaction"
        id="ReactionsIcon"
      />,
      isReachIconVisible && (
        <ReachIcon
          key="reach"
          isOpen={isReachModalOpen}
          setIsReachModalOpen={setIsReachModalOpen}
          onClick={handleReachIconClick}
          id="ReachIcon"
        />
      ),
      <SettingsIcon
        key="settings"
        isOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        id="SettingsIcon"
      />,
    ];
    switch (pageName) {
      case "/":
        icons = [<PrizesIcon key="prize" id="PrizesIcon" />, commonIcons];
        break;
      case "/prizes":
        icons = [<BackIcon key="back" id="BackIcon" />, commonIcons];
        break;
      default:
        icons = [<PrizesIcon key="prize" />, commonIcons];
    }
    return icons.filter(Boolean);
  };

  const iconElements = icons(props.pageName);

  return (
    <div>
      {isReactionModalOpen && (
        // 押下中は全スタンプボタンを無効化し、押したスタンプのみエフェクト適用
        <ReactionStampModal
          position={position}
          height={navBarHeight}
          images={images}
          disabled={isStampSending}
          activeName={activeStampName || undefined}
          onClick={handleReactionClick}
        />
      )}
      <SurveyPromptModal
        isOpened={isSurveyModalOpen}
        setIsOpened={setIsSurveyModalOpen}
        surveyUrl={surveyUrl}
      />
      <Modal isOpened={isReachModalOpen} setIsOpened={setIsReachModalOpen}>
        <div className={styles.reachModal}>
          <p>{t.reachModal.title}</p>
          <Button inversion onClick={handleReachIconClick}>
            {t.reachModal.yes}
          </Button>
          <Button onClick={() => setIsReachModalOpen(!isReachModalOpen)}>{t.reachModal.no}</Button>
        </div>
      </Modal>
      <Modal isOpened={isSettingsModalOpen} setIsOpened={setIsSettingsModalOpen}>
        <div className={styles.settingsModal}>
          {isSurveyActive && surveyUrl && (
            <div>
              <p>{t.settingsModal.survey}</p>
              <div className={styles.surveyActions}>
                <Button inversion onClick={handleAnswerSurvey}>
                  {t.settingsModal.answerSurvey}
                </Button>
              </div>
            </div>
          )}
          <div>
            <p>{t.settingsModal.languageSelection}</p>
            <ToggleButton isActive={language !== "ja"} onClick={toggleLanguage}>
              <span>{t.settingsModal.japanese}</span>
              <span>{t.settingsModal.english}</span>
            </ToggleButton>
          </div>
          <div>
            <p>{t.settingsModal.sortOrder}</p>
            <ToggleButton isActive={isSortOrderActive} onClick={toggleSortOrder}>
              <span>{t.settingsModal.drawOrder}</span>
              <span>{t.settingsModal.ascending}</span>
            </ToggleButton>
          </div>
          <div>
            <p>{t.settingsModal.theme}</p>
            <ToggleButton isActive={isDarkMode} onClick={toggleDarkMode}>
              <span>{t.settingsModal.light}</span>
              <span>{t.settingsModal.dark}</span>
            </ToggleButton>
          </div>
        </div>
      </Modal>
      <Header />
      <main className={styles.content}>{props.children}</main>
      <NavigationBar ref={navRef} isCentered={iconElements.length <= 3}>
        {iconElements}
      </NavigationBar>
    </div>
  );
};

export default Layout;
