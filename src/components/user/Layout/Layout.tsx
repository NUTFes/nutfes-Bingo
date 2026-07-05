"use client";

import { useLayoutEffect, useRef, useState, type SetStateAction } from "react";
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
import {
  Globe,
  ArrowUpDown,
  Moon,
  MessageSquare,
  Settings as SettingsLucideIcon,
  PartyPopper,
} from "lucide-react";
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

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

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
  const [reachState, setReachState] = useState({
    isSending: false,
    error: null as string | null,
  });
  const navRef = useRef<HTMLDivElement>(null);
  const { isReactionModalOpen, isSettingsModalOpen, isReachModalOpen, isSurveyModalOpen } =
    modalState;
  const { isReachIconVisible, isSortOrderActive, isDarkMode } = preferences;
  const { isSending: isStampSending, activeName: activeStampName } = stampState;
  const { isSending: isReachSending, error: reachError } = reachState;
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
  if (appState.is_survey_active !== prevSurveyActiveRef.current) {
    prevSurveyActiveRef.current = appState.is_survey_active;
    const nextSurveyModalOpen = appState.is_survey_active && Boolean(appState.survey_url);
    setModalState((prev) =>
      prev.isSurveyModalOpen === nextSurveyModalOpen
        ? prev
        : { ...prev, isSurveyModalOpen: nextSurveyModalOpen },
    );
  }

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
    if (isReachSending) {
      return;
    }

    setReachState({ isSending: true, error: null });

    try {
      await recordPublicReach();
      setPreferences((prev) => ({ ...prev, isReachIconVisible: false }));
      persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.reachIconVisible, false);
      setIsReachModalOpen(false);
    } catch (error) {
      setReachState({
        isSending: false,
        error: getActionErrorMessage(error, "リーチ送信に失敗しました。"),
      });
      return;
    }

    setReachState({ isSending: false, error: null });
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
          <div className={styles.reachIconWrapper}>
            <PartyPopper className={styles.reachModalIcon} />
          </div>
          <p className={styles.reachModalTitle}>{t.reachModal.title}</p>
          <Button disabled={isReachSending} onClick={handleConfirmReach}>
            {isReachSending ? <div className={styles.spinner}></div> : t.reachModal.yes}
          </Button>
          <button
            type="button"
            className={styles.cancelButton}
            disabled={isReachSending}
            onClick={() => setIsReachModalOpen(false)}
          >
            {t.reachModal.no}
          </button>
          {reachError && (
            <p className={styles.reachError} role="alert">
              {reachError}
            </p>
          )}
        </div>
      </Modal>
      <Modal isOpened={isSettingsModalOpen} setIsOpened={setIsSettingsModalOpen}>
        <div className={styles.settingsModal}>
          <div className={styles.settingsHeader}>
            <SettingsLucideIcon className={styles.headerIcon} />
            <h2 className={styles.modalTitle}>SETTINGS</h2>
          </div>
          <div className={styles.settingsList}>
            {appState.is_survey_active && appState.survey_url && (
              <div className={styles.settingsRow}>
                <div className={styles.settingsRowLabel}>
                  <MessageSquare className={styles.rowIcon} />
                  <span>{t.settingsModal.survey}</span>
                </div>
                <div className={styles.settingsRowControl}>
                  <Button inversion className={styles.surveyButton} onClick={handleAnswerSurvey}>
                    {t.settingsModal.answerSurvey}
                  </Button>
                </div>
              </div>
            )}
            <div className={styles.settingsRow}>
              <div className={styles.settingsRowLabel}>
                <Globe className={styles.rowIcon} />
                <span>{t.settingsModal.languageSelection}</span>
              </div>
              <div className={styles.settingsRowControl}>
                <ToggleButton isActive={language !== "ja"} onClick={toggleLanguage}>
                  <span>{t.settingsModal.japanese}</span>
                  <span>{t.settingsModal.english}</span>
                </ToggleButton>
              </div>
            </div>
            {setIsSortedAscending && (
              <div className={styles.settingsRow}>
                <div className={styles.settingsRowLabel}>
                  <ArrowUpDown className={styles.rowIcon} />
                  <span>{t.settingsModal.sortOrder}</span>
                </div>
                <div className={styles.settingsRowControl}>
                  <ToggleButton isActive={isSortOrderActive} onClick={toggleSortOrder}>
                    <span>{t.settingsModal.drawOrder}</span>
                    <span>{t.settingsModal.ascending}</span>
                  </ToggleButton>
                </div>
              </div>
            )}
            <div className={styles.settingsRow}>
              <div className={styles.settingsRowLabel}>
                <Moon className={styles.rowIcon} />
                <span>{t.settingsModal.theme}</span>
              </div>
              <div className={styles.settingsRowControl}>
                <ToggleButton isActive={isDarkMode} onClick={toggleDarkMode}>
                  <span>{t.settingsModal.light}</span>
                  <span>{t.settingsModal.dark}</span>
                </ToggleButton>
              </div>
            </div>
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
