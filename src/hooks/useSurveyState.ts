import { useEffect, useState } from "react";
import type { Event } from "@/types";

export const useSurveyState = (
  latestEvent: Event | null,
  hasShownSurvey: boolean,
  setHasShownSurvey: (value: boolean) => void,
) => {
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);

  const isSurveyActive = !!latestEvent?.isSurveyActive;
  const surveyUrl = latestEvent?.surveyUrl || "";

  useEffect(() => {
    if (!latestEvent) return;

    if (!latestEvent.isSurveyActive && hasShownSurvey) {
      setHasShownSurvey(false);
      return;
    }

    if (latestEvent.isSurveyActive && !hasShownSurvey) {
      // eslint-disable-next-line
      setIsSurveyModalOpen(true);
      setHasShownSurvey(true);
    }
  }, [latestEvent, hasShownSurvey, setHasShownSurvey]);

  return {
    surveyUrl,
    setSurveyUrl: () => {}, // No-op or throw error since it's derived
    isSurveyModalOpen,
    setIsSurveyModalOpen,
    isSurveyActive,
  } as const;
};
