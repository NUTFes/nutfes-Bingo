"use client";

import { useEffect, useRef, useState } from "react";

import { sendReactionStamp } from "@/features/user/actions/bingo-public";
import { REACTION_IMAGES } from "@/types/bingo/constants";
import type { AppStateRow } from "@/types/bingo/types";

const STAMP_COOLDOWN_MS = 2_100;
const DISMISSED_SURVEY_ACTIVATION_KEY = "bingo.dismissed-survey-activation";

type ModalState = {
  isReactionModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isReachModalOpen: boolean;
  isSurveyModalOpen: boolean;
};

export function usePublicInteractions(appState: AppStateRow) {
  const [modalState, setModalState] = useState<ModalState>({
    isReactionModalOpen: false,
    isSettingsModalOpen: false,
    isReachModalOpen: false,
    isSurveyModalOpen: false,
  });
  const [stampState, setStampState] = useState({
    isSending: false,
    activeName: null as string | null,
  });
  const stampCooldownTimerRef = useRef<number | null>(null);
  const surveyActivation =
    appState.is_survey_active && appState.survey_url ? appState.survey_url : null;

  const setModalOpen = (key: keyof ModalState, isOpened: boolean) => {
    if (key === "isSurveyModalOpen" && !isOpened && surveyActivation !== null) {
      writeDismissedSurveyActivation(surveyActivation);
    }
    setModalState((previous) =>
      previous[key] === isOpened ? previous : { ...previous, [key]: isOpened },
    );
  };

  const previousSurveyActivationRef = useRef<string | null>(null);
  useEffect(() => {
    const previousActivation = previousSurveyActivationRef.current;
    previousSurveyActivationRef.current = surveyActivation;

    if (surveyActivation === null) {
      writeDismissedSurveyActivation(null);
      setModalState((previous) =>
        previous.isSurveyModalOpen ? { ...previous, isSurveyModalOpen: false } : previous,
      );
      return;
    }
    if (surveyActivation === previousActivation) return;

    const wasDismissed = readDismissedSurveyActivation() === surveyActivation;
    setModalState((previous) =>
      previous.isSurveyModalOpen === !wasDismissed
        ? previous
        : { ...previous, isSurveyModalOpen: !wasDismissed },
    );
  }, [surveyActivation]);

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
    setReactionModalOpen: (isOpened: boolean) => setModalOpen("isReactionModalOpen", isOpened),
    setSettingsModalOpen: (isOpened: boolean) => setModalOpen("isSettingsModalOpen", isOpened),
    setReachModalOpen: (isOpened: boolean) => setModalOpen("isReachModalOpen", isOpened),
    setSurveyModalOpen: (isOpened: boolean) => setModalOpen("isSurveyModalOpen", isOpened),
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
