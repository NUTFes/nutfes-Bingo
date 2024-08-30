import { useLazyQuery, useMutation } from "@apollo/client";
import {
  CreateOneReachRecordDocument,
  GetOneLatestReachLogDocument,
} from "@/type/graphql";
import type {
  CreateOneReachRecordMutationVariables,
  CreateOneReachRecordMutation,
  GetOneLatestReachLogQuery,
} from "@/type/graphql";
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
import { UpdateOneTriggerFlagDocument } from "@/type/graphql";
import type {
  UpdateOneTriggerFlagMutation,
  UpdateOneTriggerFlagMutationVariables,
} from "@/type/graphql";
import { useMutation } from "@apollo/client";
import { ja, en } from "@/locales";

const images = [
  { id: 1, src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { id: 2, src: "/ReactionIcon/good.png", alt: " good icon" },
  { id: 3, src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { id: 4, src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { id: 5, src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { id: 6, src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { id: 7, src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { id: 8, src: "/ReactionIcon/sad.png", alt: "sad icon" },
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
  const [isSortOrderActive, setIsSortOrderActive] = useState(false);
  const [isReachModalOpen, setIsReachModalOpen] = useState<boolean>(false);
  const [isReachIconVisible, setReachIconVisible] = useState<boolean>(true);
  const [isFlag, setIsFlag] = useState<boolean>(false);
  const [navBarHeight, setNavBarHeight] = useState<string>();
  const navRef = useRef<HTMLDivElement>(null);
  const position: string = isReachIconVisible ? "29%" : "50%";
  const [updateFlag] = useMutation<
    UpdateOneTriggerFlagMutation,
    UpdateOneTriggerFlagMutationVariables
  >(UpdateOneTriggerFlagDocument);

  const [getLatestReachLog, { data: latestReachLogData }] =
    useLazyQuery<GetOneLatestReachLogQuery>(GetOneLatestReachLogDocument);

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
    const storedVisibility = localStorage.getItem("isReachIconVisible");
    if (storedVisibility !== null) {
      setReachIconVisible(storedVisibility === "true");
    }
  }, []);

  const handleReactionsiconClick = (id: number) => {
    setIsFlag(!isFlag);
    updateFlag({ variables: { id, trigger: isFlag } });
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
      props.setIsSortedAscending(!props.isSortedAscending);
    }
    setIsSortOrderActive(!isSortOrderActive);
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
          onClick={handleReactionsiconClick}
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
