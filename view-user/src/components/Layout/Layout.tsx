import { useLazyQuery, useMutation } from "@apollo/client";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
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
  Modal,
  Button,
  ToggleButton,
} from "@/components/common";
import {
  CreateOneStampTriggerDocument,
  CreateOneReachRecordDocument,
  GetOneLatestReachLogDocument,
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
  const [isSortOrderActive, setIsSortOrderActive] = useState<boolean>(false);
  const [isReachModalOpen, setIsReachModalOpen] = useState<boolean>(false);
  const [isReachIconVisible, setReachIconVisible] = useState<boolean>(true);
  const [navBarHeight, setNavBarHeight] = useState<string>();

  const DEFAULT_MAIN_COLOR = "#20a0d8";
  const DEFAULT_SUB_COLOR = "#c4deed";
  const [mainColor, setMainColor] = useState<string>(DEFAULT_MAIN_COLOR);
  const [subColor, setSubColor] = useState<string>(DEFAULT_SUB_COLOR);

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

  // navBarの高さをstring型で渡す
  useLayoutEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      setNavBarHeight(navHeight.toString());
    }
  }, []);

  // localStorageから状態を読み込む
  useEffect(() => {
    const loadStoredSettings = () => {
      const storedVisibility = localStorage.getItem("isReachIconVisible");
      if (storedVisibility !== null) {
        setReachIconVisible(storedVisibility === "true");
      }

      const storedSortOrder = localStorage.getItem("isSortedAscending");
      if (storedSortOrder !== null) {
        const isSortedAscending = storedSortOrder === "true";
        props.setIsSortedAscending?.(isSortedAscending);
        setIsSortOrderActive(isSortedAscending);
      } else {
        localStorage.setItem("isSortedAscending", "false");
      }

      const storedMainColor = localStorage.getItem("mainColor");
      const storedSubColor = localStorage.getItem("subColor");

      if (storedMainColor) {
        setMainColor(storedMainColor);
        document.documentElement.style.setProperty(
          "--main-color",
          storedMainColor,
        );
      } else {
        setMainColor(DEFAULT_MAIN_COLOR);
        document.documentElement.style.setProperty(
          "--main-color",
          DEFAULT_MAIN_COLOR,
        );
      }

      if (storedSubColor) {
        setSubColor(storedSubColor);
        document.documentElement.style.setProperty(
          "--sub-color",
          storedSubColor,
        );
      } else {
        setSubColor(DEFAULT_SUB_COLOR);
        document.documentElement.style.setProperty(
          "--sub-color",
          DEFAULT_SUB_COLOR,
        );
      }
    };

    loadStoredSettings();
  }, [props]);

  const handleReactionClick = (name: string) => {
    createStampRecord({ variables: { name } });
  };

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

  const handleMainColorChange = (color: any) => {
    const newColor = color.hex;
    setMainColor(newColor);
    localStorage.setItem("mainColor", newColor);
    document.documentElement.style.setProperty("--main-color", newColor);
  };

  const handleSubColorChange = (color: any) => {
    const newColor = color.hex;
    setSubColor(newColor);
    localStorage.setItem("subColor", newColor);
    document.documentElement.style.setProperty("--sub-color", newColor);
  };

  const icons = (pageName: string) => {
    let icons = [];
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
        icons = [<PrizesIcon key="prize" />, commonIcons];
        break;
      case "/prizes":
        icons = [<BackIcon key="back" />, commonIcons];
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
              colors={[
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
              ]}
              triangle="hide"
              onChange={handleMainColorChange}
            />
          </div>
          <div>
            <p>サブカラー</p>
            <TwitterPicker
              color={subColor}
              colors={[
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
              ]}
              triangle="hide"
              onChange={handleSubColorChange}
            />
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
