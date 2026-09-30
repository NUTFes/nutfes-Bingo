import { ArrowUpDown, Globe, MessageSquare, Moon, Settings as SettingsIcon } from "lucide-react";

import Button from "@/components/user/buttons/Button";
import ToggleButton from "@/components/user/buttons/ToggleButton";
import Modal from "@/components/user/Modal";
import type { AppStateRow } from "@/types/bingo/types";
import { useBingoLanguage } from "@/utils/i18n/provider";

import styles from "./SettingsModal.module.css";

interface SettingsModalProps {
  appState: AppStateRow;
  isDarkMode: boolean;
  isSortOrderActive: boolean;
  setIsOpened: (isOpened: boolean) => void;
  onToggleDarkMode: () => void;
  onToggleSortOrder?: () => void;
  onAnswerSurvey: () => void;
}

export default function SettingsModal({
  appState,
  isDarkMode,
  isSortOrderActive,
  setIsOpened,
  onToggleDarkMode,
  onToggleSortOrder,
  onAnswerSurvey,
}: SettingsModalProps) {
  const { language, setLanguage, t } = useBingoLanguage();

  return (
    <Modal isOpened setIsOpened={setIsOpened}>
      <div className={styles.settingsModal}>
        <div className={styles.settingsHeader}>
          <SettingsIcon className={styles.headerIcon} />
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
                <Button inversion className={styles.surveyButton} onClick={onAnswerSurvey}>
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
              <ToggleButton
                isActive={language !== "ja"}
                onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
              >
                <span>{t.settingsModal.japanese}</span>
                <span>{t.settingsModal.english}</span>
              </ToggleButton>
            </div>
          </div>
          {onToggleSortOrder && (
            <div className={styles.settingsRow}>
              <div className={styles.settingsRowLabel}>
                <ArrowUpDown className={styles.rowIcon} />
                <span>{t.settingsModal.sortOrder}</span>
              </div>
              <div className={styles.settingsRowControl}>
                <ToggleButton isActive={isSortOrderActive} onClick={onToggleSortOrder}>
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
              <ToggleButton isActive={isDarkMode} onClick={onToggleDarkMode}>
                <span>{t.settingsModal.light}</span>
                <span>{t.settingsModal.dark}</span>
              </ToggleButton>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
