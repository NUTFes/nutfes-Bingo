"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { REACTION_IMAGES } from "@/types/bingo/constants";
import type { AppStateRow } from "@/types/bingo/types";
import { BingoLanguageProvider, useBingoLanguage } from "@/utils/i18n/provider";
import { openHttpsUrl } from "@/utils/url";
import ReachConfirmationModal from "@/components/user/ReachConfirmationModal";

import styles from "./Layout.module.css";
import {
  persistBooleanPreference,
  usePublicPreferences,
} from "@/components/user/Layout/usePublicPreferences";
import { usePublicInteractions } from "@/components/user/Layout/usePublicInteractions";
import {
  DEFAULT_PUBLIC_PREFERENCES,
  PUBLIC_PREFERENCE_KEYS,
  type PublicPreferences,
} from "@/types/bingo/public-preferences";

interface InnerLayoutProps {
  children: React.ReactNode;
  appState: AppStateRow;
  initialPreferences?: PublicPreferences;
  isSortedAscending?: boolean;
  setIsSortedAscending?: (value: boolean) => void;
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

  const interactions = usePublicInteractions(appState);
  const { preferences, setPreferences } = usePublicPreferences(
    initialPreferences,
    setIsSortedAscending,
  );
  const [navBarHeight, setNavBarHeight] = useState<string>();
  const { modalState, stampState } = interactions;
  const navRef = useRef<HTMLDivElement>(null);
  const { isReactionModalOpen, isSettingsModalOpen, isReachModalOpen, isSurveyModalOpen } =
    modalState;
  const { isReachIconVisible, isSortOrderActive, isDarkMode } = preferences;
  const { isSending: isStampSending, activeName: activeStampName } = stampState;
  const setIsReactionModalOpen = (value: React.SetStateAction<boolean>) =>
    interactions.setReactionModalOpen(
      typeof value === "function" ? value(modalState.isReactionModalOpen) : value,
    );
  const setIsSettingsModalOpen = (value: React.SetStateAction<boolean>) =>
    interactions.setSettingsModalOpen(
      typeof value === "function" ? value(modalState.isSettingsModalOpen) : value,
    );
  const setIsReachModalOpen = (value: React.SetStateAction<boolean>) =>
    interactions.setReachModalOpen(
      typeof value === "function" ? value(modalState.isReachModalOpen) : value,
    );
  const setIsSurveyModalOpen = (value: React.SetStateAction<boolean>) =>
    interactions.setSurveyModalOpen(
      typeof value === "function" ? value(modalState.isSurveyModalOpen) : value,
    );
  const position = isReachIconVisible ? "29%" : "50%";

  useLayoutEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.getBoundingClientRect().height;
      setNavBarHeight(navHeight.toString());
    }
  }, []);

  const handleReactionClick = interactions.sendStamp;

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
      {isReachModalOpen && (
        <ReachConfirmationModal
          copy={t.reachModal}
          language={language}
          onClose={() => setIsReachModalOpen(false)}
          onConfirmed={() => {
            setPreferences((previous) => ({ ...previous, isReachIconVisible: false }));
            persistBooleanPreference(PUBLIC_PREFERENCE_KEYS.reachIconVisible, false);
          }}
        />
      )}
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
