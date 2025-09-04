import { useLazyQuery, useMutation, useSubscription } from "@apollo/client";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useRecoilState } from "recoil";
import { hasShownSurveyState } from "@/state/survey";
import { useRouter } from "next/router";
import styles from "./Layout.module.css";
import "intro.js/minified/introjs.min.css";
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
} from "@/components/common";
import {
  CreateOneStampTriggerDocument,
  CreateOneReachRecordDocument,
  GetOneLatestReachLogDocument,
  SubscribeLatestEventSurveyDocument,
} from "@/types/graphql";
import type {
  CreateOneStampTriggerMutation,
  CreateOneStampTriggerMutationVariables,
  CreateOneReachRecordMutation,
  CreateOneReachRecordMutationVariables,
  GetOneLatestReachLogQuery,
} from "@/types/graphql";
import { ja, en } from "@/locales";
import { TwitterPicker } from "react-color";
import { useSurveyState } from "@/hooks/useSurveyState";

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
  language?: string;
  setLanguage?: (value: string) => void;
}

const Layout = (props: LayoutProps) => {
  const router = useRouter();
  const t = props.language === "ja" ? ja : en;

  const [isReactionModalOpen, setIsReactionModalOpen] =
    useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);
  const [hasShownSurvey, setHasShownSurvey] =
    useRecoilState(hasShownSurveyState);

  const [isSortOrderActive, setIsSortOrderActive] = useState<boolean>(false);
  const { setIsSortedAscending } = props;

  const [isReachModalOpen, setIsReachModalOpen] = useState<boolean>(false);
  const [isReachIconVisible, setReachIconVisible] = useState<boolean>(true);

  const [mainColor, setMainColor] = useState(COLOR_PRESETS.DEFAULT_MAIN_COLOR);
  const [subColor, setSubColor] = useState(COLOR_PRESETS.DEFAULT_SUB_COLOR);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [navBarHeight, setNavBarHeight] = useState<string>();
  const navRef = useRef<HTMLDivElement>(null);
  const position: string = isReachIconVisible ? "29%" : "50%";
  const [createStampRecord] = useMutation<
    CreateOneStampTriggerMutation,
    CreateOneStampTriggerMutationVariables
  >(CreateOneStampTriggerDocument);
  const [getLatestReachLog] = useLazyQuery<GetOneLatestReachLogQuery>(
    GetOneLatestReachLogDocument,
  );

  const [createOneReachRecord] = useMutation<
    CreateOneReachRecordMutation,
    CreateOneReachRecordMutationVariables
  >(CreateOneReachRecordDocument);

  // アンケート配信の軽量サブスク（番号サブスクとは分離）
  const { data: surveyEvent } = useSubscription(
    SubscribeLatestEventSurveyDocument,
  );

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
      setIsSortOrderActive(isSortedAscending);
    } else {
      localStorage.setItem("isSortedAscending", "false");
    }

    const storedDarkMode = localStorage.getItem("isDarkMode");
    if (storedDarkMode !== null) {
      setIsDarkMode(storedDarkMode === "true");
    } else {
      localStorage.setItem("isDarkMode", "false");
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
    const backgroundColor = isDarkMode ? "#2C252F" : "#FFFFFF";
    const numberAccentColor = isDarkMode ? "#1a171e" : subColor;
    const footerBorderColor = isDarkMode ? "var(--main-color)" : "#000000";
    const navTopShadowColor = isDarkMode ? "var(--main-color)" : "transparent";
    document.documentElement.style.setProperty(
      "--background-color",
      backgroundColor,
    );
    document.documentElement.style.setProperty(
      "--number-accent-color",
      numberAccentColor,
    );
    document.documentElement.style.setProperty(
      "--footer-border-color",
      footerBorderColor,
    );
    document.documentElement.style.setProperty(
      "--nav-top-shadow-color",
      navTopShadowColor,
    );
    const metaTheme = document.querySelector(
      'meta[name="theme-color"]',
    ) as HTMLMetaElement | null;
    if (metaTheme) metaTheme.content = backgroundColor;
  }, [isDarkMode, subColor]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("isDarkMode", next.toString());
  };

  // アンケート状態管理（カスタムフック）
  const {
    surveyUrl,
    setSurveyUrl,
    isSurveyModalOpen,
    setIsSurveyModalOpen,
    isSurveyActive,
  } = useSurveyState(surveyEvent, hasShownSurvey, setHasShownSurvey);

  // リアクションアイコンがクリックされたときの処理
  const handleReactionClick = (name: string) => {
    createStampRecord({ variables: { name } });
  };

  // 設定内のアンケート回答ボタンの処理
  const handleAnswerSurvey = () => {
    if (surveyUrl) window.open(surveyUrl, "_blank", "noopener,noreferrer");
  };

  // リーチアイコンがクリックされたときの処理
  const handleReachIconClick = async () => {
    try {
      const { data } = await getLatestReachLog();
      const latestReachLogNumber = data?.reachLogs[0]?.reachNum || 0;
      await createOneReachRecord({
        variables: {
          status: true,
          reachNum: latestReachLogNumber + 1,
        },
      });

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
    const newLocale = props.language === "ja" ? "en" : "ja";
    router.push(router.pathname, router.asPath, { locale: newLocale });
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
        <ReactionStampModal
          position={position}
          height={navBarHeight}
          images={images}
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
          <Button onClick={() => setIsReachModalOpen(!isReachModalOpen)}>
            {t.reachModal.no}
          </Button>
        </div>
      </Modal>
      <Modal
        isOpened={isSettingsModalOpen}
        setIsOpened={setIsSettingsModalOpen}
      >
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
            <ToggleButton
              isActive={props.language !== "ja"}
              onClick={toggleLanguage}
            >
              <span>{t.settingsModal.japanese}</span>
              <span>{t.settingsModal.english}</span>
            </ToggleButton>
          </div>
          <div>
            <p>{t.settingsModal.sortOrder}</p>
            <ToggleButton
              isActive={isSortOrderActive}
              onClick={toggleSortOrder}
            >
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
