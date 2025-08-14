import { useLazyQuery, useMutation, useSubscription } from "@apollo/client";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useRecoilState } from "recoil";
import { hasShownSurveyState } from "@/state/survey";
import { useRouter } from "next/router";
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

  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [hasShownSurvey, setHasShownSurvey] =
    useRecoilState(hasShownSurveyState);

  const [isSortOrderActive, setIsSortOrderActive] = useState(false);
  const { setIsSortedAscending } = props;

  const [isReachModalOpen, setIsReachModalOpen] = useState(false);
  const [isReachIconVisible, setReachIconVisible] = useState(true);

  const [mainColor, setMainColor] = useState(COLOR_PRESETS.DEFAULT_MAIN_COLOR);
  const [subColor, setSubColor] = useState(COLOR_PRESETS.DEFAULT_SUB_COLOR);

  const [navBarHeight, setNavBarHeight] = useState<string>();
  const navRef = useRef<HTMLDivElement>(null);
  const position = isReachIconVisible ? "29%" : "50%";

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

  // ローカルストレージから設定を読み込む
  useEffect(() => {
    const storedSortOrder = localStorage.getItem("isSortedAscending");
    const storedVisibility = localStorage.getItem("isReachIconVisible");
    const storedMainColor = localStorage.getItem("mainColor");
    const storedSubColor = localStorage.getItem("subColor");

    setIsSortOrderActive(
      storedSortOrder !== null ? storedSortOrder === "true" : false,
    );
    setReachIconVisible(
      storedVisibility !== null ? storedVisibility === "true" : true,
    );
    setMainColor(storedMainColor || COLOR_PRESETS.DEFAULT_MAIN_COLOR);
    setSubColor(storedSubColor || COLOR_PRESETS.DEFAULT_SUB_COLOR);
  }, []);

  // 初期設定を適用
  useEffect(() => {
    // ソート順を親コンポーネントに伝える
    setIsSortedAscending?.(isSortOrderActive);

    // カラーを適用
    document.documentElement.style.setProperty("--main-color", mainColor);
    document.documentElement.style.setProperty("--sub-color", subColor);
  }, [isSortOrderActive, mainColor, subColor, setIsSortedAscending]);

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

  // ソート順を切り替える
  const toggleSortOrder = () => {
    const newSortOrder = !isSortOrderActive;
    localStorage.setItem("isSortedAscending", newSortOrder.toString());
    setIsSortedAscending?.(newSortOrder);
    setIsSortOrderActive(newSortOrder);
  };

  // 言語を切り替える
  const toggleLanguage = () => {
    const newLocale = props.language === "ja" ? "en" : "ja";
    router.push(router.pathname, router.asPath, { locale: newLocale });
  };

  // メインカラーを変更する
  const handleMainColorChange = (color: { hex: string }) => {
    const newColor = color.hex;
    setMainColor(newColor);
    localStorage.setItem("mainColor", newColor);
    document.documentElement.style.setProperty("--main-color", newColor);
  };

  // サブカラーを変更する
  const handleSubColorChange = (color: { hex: string }) => {
    const newColor = color.hex;
    setSubColor(newColor);
    localStorage.setItem("subColor", newColor);
    document.documentElement.style.setProperty("--sub-color", newColor);
  };

  // カラーをリセットする
  const resetColors = () => {
    setMainColor(COLOR_PRESETS.DEFAULT_MAIN_COLOR);
    setSubColor(COLOR_PRESETS.DEFAULT_SUB_COLOR);
    localStorage.removeItem("mainColor");
    localStorage.removeItem("subColor");
    document.documentElement.style.setProperty(
      "--main-color",
      COLOR_PRESETS.DEFAULT_MAIN_COLOR,
    );
    document.documentElement.style.setProperty(
      "--sub-color",
      COLOR_PRESETS.DEFAULT_SUB_COLOR,
    );
  };

  // ページごとのアイコンを設定する
  const icons = (pageName: string) => {
    const commonIcons = [
      <ReactionsIcon
        isOpen={isReactionModalOpen}
        setIsReactionModalOpen={setIsReactionModalOpen}
        key="reaction"
      />,
      isReachIconVisible && (
        <ReachIcon
          key="reach"
          isOpen={isReachModalOpen}
          setIsReachModalOpen={setIsReachModalOpen}
          onClick={handleReachIconClick}
        />
      ),
      <SettingsIcon
        key="settings"
        isOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
      />,
    ];

    switch (pageName) {
      case "/":
        return [<PrizesIcon key="prize" />, ...commonIcons];
      case "/prizes":
        return [<BackIcon key="back" />, ...commonIcons];
      default:
        return [<PrizesIcon key="prize" />, ...commonIcons];
    }
  };

  const iconElements = icons(props.pageName).filter(Boolean);

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
            <p>メインカラー</p>
            <TwitterPicker
              color={mainColor}
              colors={COLOR_PRESETS.MAIN_COLORS}
              triangle="hide"
              onChange={handleMainColorChange}
            />
          </div>
          <div>
            <p>サブカラー</p>
            <TwitterPicker
              color={subColor}
              colors={COLOR_PRESETS.SUB_COLORS}
              triangle="hide"
              onChange={handleSubColorChange}
            />
          </div>
          <div className={styles.resetButton}>
            <Button onClick={resetColors}>カラーを初期値に戻す</Button>
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
