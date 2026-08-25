"use client";

import { useEffect, useRef, useState } from "react";

import { sendReactionStamp } from "@/features/user/actions/bingo-public";
import { REACTION_IMAGES } from "@/types/bingo/constants";
import type { AppStateRow } from "@/types/bingo/types";

const STAMP_COOLDOWN_MS = 2_100;
const DISMISSED_SURVEY_ACTIVATION_KEY = "bingo.dismissed-survey-activation";

type PublicModalName = "reaction" | "settings" | "reach" | "survey";

type ModalState = {
  isReactionModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isReachModalOpen: boolean;
  isSurveyModalOpen: boolean;
};

export function usePublicInteractions(appState: AppStateRow) {
  const [activeModal, setActiveModal] = useState<PublicModalName | null>(null);
  const [stampState, setStampState] = useState({
    isSending: false,
    activeName: null as string | null,
  });
  const stampCooldownTimerRef = useRef<number | null>(null);
  const dismissedSurveyActivationRef = useRef<string | null>(null);
  const surveyActivation =
    appState.is_survey_active && appState.survey_url ? appState.survey_url : null;

  const modalState: ModalState = {
    isReactionModalOpen: activeModal === "reaction",
    isSettingsModalOpen: activeModal === "settings",
    isReachModalOpen: activeModal === "reach",
    isSurveyModalOpen: activeModal === "survey",
  };

  const setModalOpen = (modal: PublicModalName, isOpened: boolean) => {
    if (modal === "survey" && !isOpened && surveyActivation !== null) {
      dismissedSurveyActivationRef.current = surveyActivation;
      writeDismissedSurveyActivation(surveyActivation);
    }
    if (modal !== "survey" && isOpened && activeModal === "survey" && surveyActivation !== null) {
      dismissedSurveyActivationRef.current = surveyActivation;
      writeDismissedSurveyActivation(surveyActivation);
    }

    setActiveModal((previous) => {
      if (isOpened) {
        return previous === modal ? previous : modal;
      }
      return previous === modal ? null : previous;
    });
  };

  useEffect(() => {
    if (surveyActivation === null) {
      dismissedSurveyActivationRef.current = null;
      writeDismissedSurveyActivation(null);
      setActiveModal((previous) => (previous === "survey" ? null : previous));
      return;
    }
    if (activeModal !== null) return;

    const wasDismissed =
      dismissedSurveyActivationRef.current === surveyActivation ||
      readDismissedSurveyActivation() === surveyActivation;
    if (!wasDismissed) {
      setActiveModal("survey");
    }
  }, [activeModal, surveyActivation]);

  useEffect(
    () => () => {
      if (stampCooldownTimerRef.current !== null) {
        window.clearTimeout(stampCooldownTimerRef.current);
      }
    },
    [],
  );

  const sendStamp = async (name: string) => {
    if (stampState.isSending) return;

    const startedAt = performance.now();
    setStampState({ isSending: true, activeName: name });
    try {
      await sendReactionStamp(name as (typeof REACTION_IMAGES)[number]["name"]);
    } catch (error) {
      // Reactions are loss-tolerant. Keep the UI responsive while retaining a diagnostic signal.
      console.error("リアクション送信に失敗しました。", error);
    } finally {
      const remainingCooldown = Math.max(0, STAMP_COOLDOWN_MS - (performance.now() - startedAt));
      stampCooldownTimerRef.current = window.setTimeout(() => {
        stampCooldownTimerRef.current = null;
        setStampState({ isSending: false, activeName: null });
      }, remainingCooldown);
    }
  };

  return {
    modalState,
    stampState,
    setReactionModalOpen: (isOpened: boolean) => setModalOpen("reaction", isOpened),
    setSettingsModalOpen: (isOpened: boolean) => setModalOpen("settings", isOpened),
    setReachModalOpen: (isOpened: boolean) => setModalOpen("reach", isOpened),
    setSurveyModalOpen: (isOpened: boolean) => setModalOpen("survey", isOpened),
    sendStamp,
  };
}

function readDismissedSurveyActivation(): string | null {
  try {
    return window.sessionStorage.getItem(DISMISSED_SURVEY_ACTIVATION_KEY);
  } catch {
    return null;
  }
}

function writeDismissedSurveyActivation(activation: string | null): void {
  try {
    if (activation === null) {
      window.sessionStorage.removeItem(DISMISSED_SURVEY_ACTIVATION_KEY);
    } else {
      window.sessionStorage.setItem(DISMISSED_SURVEY_ACTIVATION_KEY, activation);
    }
  } catch {
    // The prompt still works when storage is unavailable; dismissal then lasts for this mount.
  }
}
