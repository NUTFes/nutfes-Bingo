"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { REACTION_IMAGES } from "@/lib/bingo/constants";
import { recordPublicReach, sendReactionStamp } from "@/app/actions/bingo-public";
import { useAppState } from "@/lib/bingo/client";
import {
  applyPublicTheme,
  DEFAULT_PUBLIC_PREFERENCES,
  preferenceCookie,
  PUBLIC_PREFERENCE_KEYS,
  type PublicPreferences,
  parseBooleanPreference,
  resolveDarkModePreference,
} from "@/lib/bingo/public-preferences";
import type { AppStateRow } from "@/lib/bingo/types";
import { BingoLanguageProvider, useBingoLanguage } from "@/lib/i18n/provider";

import styles from "./Layout.module.css";

interface InnerLayoutProps {
  children: React.ReactNode;
  initialAppState: AppStateRow;
  initialPreferences?: PublicPreferences;
  isSortedAscending?: boolean;
  setIsSortedAscending?: (value: boolean) => void;
}

const persistBooleanPreference = (key: string, value: boolean) => {
  window.localStorage.setItem(key, value.toString());
  document.cookie = preferenceCookie(key, value);
};

function InnerLayout({
  children,
  initialAppState,
  initialPreferences = DEFAULT_PUBLIC_PREFERENCES,
  isSortedAscending,
  setIsSortedAscending,
}: InnerLayoutProps) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useBingoLanguage();
  const [appState] = useAppState(initialAppState);

  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isReachModalOpen, setIsReachModalOpen] = useState(false);
  const [isReachIconVisible, setReachIconVisible] = useState(initialPreferences.isReachIconVisible);
  const [isSortOrderActive, setIsSortOrderActive] = useState(initialPreferences.isSortedAscending);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    resolveDarkModePreference(initialPreferences.isDarkMode),
  );
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [hasShownSurvey, setHasShownSurvey] = useState(false);
  const [navBarHeight, setNavBarHeight] = useState<string>();
  const [isStampSending, setIsStampSending] = useState(false);
  const [activeStampName, setActiveStampName] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
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
    setReachIconVisible(nextReachVisibility);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.reachIconVisible, nextReachVisibility);

    const nextSortOrder = parseBooleanPreference(
      window.localStorage.getItem(PUBLIC_PREFERENCE_KEYS.sortedAscending) ?? undefined,
      initialPreferences.isSortedAscending,
    );
    setIsSortOrderActive(nextSortOrder);
    setIsSortedAscending?.(nextSortOrder);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.sortedAscending, nextSortOrder);

    const nextDarkMode = resolveDarkModePreference(initialPreferences.isDarkMode);
    setIsDarkMode(nextDarkMode);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, nextDarkMode);
  }, [initialPreferences, setIsSortedAscending]);

  useLayoutEffect(() => {
    applyPublicTheme(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    setIsSortedAscending?.(isSortOrderActive);
  }, [isSortOrderActive, setIsSortedAscending]);

  useEffect(() => {
    if (!appState.is_survey_active && hasShownSurvey) {
      setHasShownSurvey(false);
      return;
    }

    if (appState.is_survey_active && !hasShownSurvey && appState.survey_url) {
      setIsSurveyModalOpen(true);
      setHasShownSurvey(true);
    }
  }, [appState.is_survey_active, appState.survey_url, hasShownSurvey]);

  const handleReactionClick = async (name: string) => {
    if (isStampSending) {
      return;
    }

    try {
      setActiveStampName(name);
      setIsStampSending(true);
      await sendReactionStamp(name as (typeof REACTION_IMAGES)[number]["name"]);
    } finally {
      window.setTimeout(() => {
        setIsStampSending(false);
        setActiveStampName(null);
      }, 800);
    }
  };

  const handleConfirmReach = async () => {
    await recordPublicReach();
    setReachIconVisible(false);
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
    setIsSortOrderActive(next);
  };

  const toggleLanguage = () => {
    setLanguage(language === "ja" ? "en" : "ja");
  };

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.darkMode, next);
  };

  const handleAnswerSurvey = () => {
    if (appState.survey_url) {
      window.open(appState.survey_url, "_blank", "noopener,noreferrer");
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
    <div>
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
