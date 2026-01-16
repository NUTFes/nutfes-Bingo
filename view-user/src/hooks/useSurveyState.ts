import { useEffect, useState } from "react";
import type { Event } from "@/lib/supabase";

export const useSurveyState = (
  latestEvent: Event | null,
  hasShownSurvey: boolean,
  setHasShownSurvey: (value: boolean) => void,
) => {
  const [surveyUrl, setSurveyUrl] = useState<string>("");
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);
  const [isSurveyActive, setIsSurveyActive] = useState<boolean>(false);

  useEffect(() => {
    if (!latestEvent) return;

    setIsSurveyActive(!!latestEvent.isSurveyActive);
    setSurveyUrl(latestEvent.surveyUrl || "");

    if (!latestEvent.isSurveyActive && hasShownSurvey) {
      setHasShownSurvey(false);
      return;
    }

    if (latestEvent.isSurveyActive && !hasShownSurvey) {
      setSurveyUrl(latestEvent.surveyUrl || "");
      setIsSurveyModalOpen(true);
      setHasShownSurvey(true);
    }
  }, [latestEvent, hasShownSurvey, setHasShownSurvey]);

  return {
    surveyUrl,
    setSurveyUrl,
    isSurveyModalOpen,
    setIsSurveyModalOpen,
    isSurveyActive,
  } as const;
};
