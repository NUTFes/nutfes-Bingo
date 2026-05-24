"use client";

import { useEffect, useLayoutEffect, useRef, useState, type SetStateAction } from "react";
import { usePathname } from "next/navigation";

import {
  BackIcon,
  Button,
  Header,
  Modal,
  NavigationBar,
  PrizesIcon,
  ReactionStampModal,
  ReachIcon,
  ReactionsIcon,
  SettingsIcon,
  SurveyPromptModal,
  ToggleButton,
} from "@/components/user/common";
import { REACTION_IMAGES } from "@/types/bingo/constants";
import {
  applyPublicTheme,
  DEFAULT_PUBLIC_PREFERENCES,
  preferenceCookie,
  PUBLIC_PREFERENCE_KEYS,
  type PublicPreferences,
  parseBooleanPreference,
  resolveDarkModePreference,
} from "@/types/bingo/public-preferences";
import type { AppStateRow } from "@/types/bingo/types";
import { BingoLanguageProvider, useBingoLanguage } from "@/utils/i18n/provider";
import { recordPublicReach, sendReactionStamp } from "@/features/user/actions/bingo-public";
import { openHttpsUrl } from "@/utils/url";

import styles from "./Layout.module.css";

interface InnerLayoutProps {
  children: React.ReactNode;
  appState: AppStateRow;
  initialPreferences?: PublicPreferences;
  isSortedAscending?: boolean;
  setIsSortedAscending?: (value: boolean) => void;
}

type ModalState = {
  isReactionModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isReachModalOpen: boolean;
  isSurveyModalOpen: boolean;
};

type ModalToggleKey = keyof ModalState;

const persistBooleanPreference = (key: string, value: boolean) => {
  window.localStorage.setItem(key, value.toString());
  document.cookie = preferenceCookie(key, value);
};

function InnerLayout({
  children,
  appState,
  initialPreferences = DEFAULT_PUBLIC_PREFERENCES,
  isSortedAscending,
  setIsSortedAscending,
}: InnerLayoutProps) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useBingoLanguage();

  const [modalState, setModalState] = useState<ModalState>({
    isReactionModalOpen: false,
    isSettingsModalOpen: false,
    isReachModalOpen: false,
    isSurveyModalOpen: false,
  });
  const [preferences, setPreferences] = useState(() => ({
    isReachIconVisible: initialPreferences.isReachIconVisible,
    isSortOrderActive: initialPreferences.isSortedAscending,
    isDarkMode: resolveDarkModePreference(initialPreferences.isDarkMode),
  }));
  const [navBarHeight, setNavBarHeight] = useState<string>();
  const [stampState, setStampState] = useState({
    isSending: false,
    activeName: null as string | null,
  });
  const navRef = useRef<HTMLDivElement>(null);
  const { isReactionModalOpen, isSettingsModalOpen, isReachModalOpen, isSurveyModalOpen } =
    modalState;
  const { isReachIconVisible, isSortOrderActive, isDarkMode } = preferences;
  const { isSending: isStampSending, activeName: activeStampName } = stampState;
  const setModalOpen = (key: ModalToggleKey) => (value: SetStateAction<boolean>) => {
    setModalState((prev) => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  };
  const setIsReactionModalOpen = setModalOpen("isReactionModalOpen");
  const setIsSettingsModalOpen = setModalOpen("isSettingsModalOpen");
  const setIsReachModalOpen = setModalOpen("isReachModalOpen");
  const setIsSurveyModalOpen = setModalOpen("isSurveyModalOpen");
  const position = isReachIconVisible ? "29%" : "50%";

  useLayoutEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      setNavBarHeight(navHeight.toString());
    }
  }, []);

  useLayoutEffect(() => {
    const nextReachVisibility = parseBooleanPreference(
      window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.reachIconVisible) ?? undefined,
      initialPreferences.isReachIconVisible,
    );
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.reachIconVisible, nextReachVisibility);

    const nextSortOrder = parseBooleanPreference(
      window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.sortedAscending) ?? undefined,
      initialPreferences.isSortedAscending,
    );
    setIsSortedAscending?.(nextSortOrder);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending, nextSortOrder);

    const nextDarkMode = resolveDarkModePreference(initialPreferences.isDarkMode);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, nextDarkMode);

    setPreferences({
      isReachIconVisible: nextReachVisibility,
      isSortOrderActive: nextSortOrder,
      isDarkMode: nextDarkMode,
    });
  }, [initialPreferences, setIsSortedAscending]);

  useLayoutEffect(() => {
    applyPublicTheme(isDarkMode);
  }, [isDarkMode]);

  const prevSurveyActiveRef = useRef(appState.is_survey_active);
  useEffect(() => {
    if (appState.is_survey_active === prevSurveyActiveRef.current) {
      return;
    }

    prevSurveyActiveRef.current = appState.is_survey_active;
    if (appState.is_survey_active && appState.survey_url) {
      setModalState((prev) => ({ ...prev, isSurveyModalOpen: true }));
    } else if (!appState.is_survey_active) {
      setModalState((prev) => ({ ...prev, isSurveyModalOpen: false }));
    }
  }, [appState.is_survey_active, appState.survey_url]);

  const handleReactionClick = async (name: string) => {
    if (isStampSending) {
      return;
    }

    try {
      setStampState({
        isSending: true,
        activeName: name,
      });
      await sendReactionStamp(name as (typeof REACTION_IMAGES)[number]["name"]);
    } finally {
      window.setTimeout(() => {
        setStampState({
          isSending: false,
          activeName: null,
        });
      }, 800);
    }
  };

  const handleConfirmReach = async () => {
    await recordPublicReach();
    setPreferences((prev) => ({ ...prev, isReachIconVisible: false }));
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.reachIconVisible, false);
    setIsReachModalOpen(false);
  };

  const toggleSortOrder = () => {
    if (!setIsSortedAscending) {
      return;
    }

    const next = !isSortedAscending;
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending, next);
    setIsSortedAscending(next);
    setPreferences((prev) => ({ ...prev, isSortOrderActive: next }));
  };

  const toggleLanguage = () => {
    setLanguage(language === "ja" ? "en" : "ja");
  };

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setPreferences((prev) => ({ ...prev, isDarkMode: next }));
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, next);
  };

  const handleAnswerSurvey = () => {
    if (appState.survey_url) {
      openHttpsUrl(appState.survey_url);
    }
  };

  const iconElements = [
    pathname === "/prizes" ? (
      <BackIcon key="back" id="BackIcon" />
    ) : (
      <PrizesIcon key="prize" id="PrizesIcon" />
    ),
    <ReactionsIcon
      key="reaction"
      isOpen={isReactionModalOpen}
      setIsReactionModalOpen={setIsReactionModalOpen}
      id="ReactionsIcon"
    />,
    isReachIconVisible ? (
      <ReachIcon
        key="reach"
        isOpen={isReachModalOpen}
        setIsReachModalOpen={setIsReachModalOpen}
        id="ReachIcon"
      />
    ) : null,
    <SettingsIcon
      key="settings"
      isOpen={isSettingsModalOpen}
      setIsSettingsModalOpen={setIsSettingsModalOpen}
      id="SettingsIcon"
    />,
  ].filter(Boolean);

  return (
    <div className={styles.layoutWrapper}>
      {isReactionModalOpen && (
        <ReactionStampModal
          position={position}
          height={navBarHeight}
          images={[...REACTION_IMAGES]}
          disabled={isStampSending}
          activeName={activeStampName || undefined}
          onClick={handleReactionClick}
        />
      )}
      <SurveyPromptModal
        isOpened={isSurveyModalOpen}
        setIsOpened={setIsSurveyModalOpen}
        surveyUrl={appState.survey_url}
      />
      <Modal isOpened={isReachModalOpen} setIsOpened={setIsReachModalOpen}>
        <div className={styles.reachModal}>
          <p>{t.reachModal.title}</p>
          <Button inversion onClick={handleConfirmReach}>
            {t.reachModal.yes}
          </Button>
          <Button onClick={() => setIsReachModalOpen(false)}>{t.reachModal.no}</Button>
        </div>
      </Modal>
      <Modal isOpened={isSettingsModalOpen} setIsOpened={setIsSettingsModalOpen}>
        <div className={styles.settingsModal}>
          {appState.is_survey_active && appState.survey_url && (
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
          {setIsSortedAscending && (
            <div>
              <p>{t.settingsModal.sortOrder}</p>
              <ToggleButton isActive={isSortOrderActive} onClick={toggleSortOrder}>
                <span>{t.settingsModal.drawOrder}</span>
                <span>{t.settingsModal.ascending}</span>
              </ToggleButton>
            </div>
          )}
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
      <main className={styles.content}>{children}</main>
      <NavigationBar ref={navRef} isCentered={iconElements.length <= 3}>
        {iconElements}
      </NavigationBar>
    </div>
  );
}

interface LayoutProps extends InnerLayoutProps {}

const Layout = (props: LayoutProps) => {
  return (
    <BingoLanguageProvider>
      <InnerLayout {...props} />
    </BingoLanguageProvider>
  );
};

export default Layout;
