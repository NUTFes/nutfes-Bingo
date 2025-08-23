import { useEffect, useState } from "react";

export const useSurveyState = (
  surveyEvent: any,
  hasShownSurvey: boolean,
  setHasShownSurvey: (value: boolean) => void,
) => {
  const [surveyUrl, setSurveyUrl] = useState<string>("");
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);
  const [isSurveyActive, setIsSurveyActive] = useState<boolean>(false);

  useEffect(() => {
    const latest = surveyEvent?.events?.[0];
    if (!latest) return;

    setIsSurveyActive(!!latest.isSurveyActive);
    setSurveyUrl(latest.surveyUrl || "");

    if (!latest.isSurveyActive && hasShownSurvey) {
      setHasShownSurvey(false);
      return;
    }

    if (latest.isSurveyActive && !hasShownSurvey) {
      setSurveyUrl(latest.surveyUrl || "");
      setIsSurveyModalOpen(true);
      setHasShownSurvey(true);
    }
  }, [surveyEvent, hasShownSurvey, setHasShownSurvey]);

  return {
    surveyUrl,
    setSurveyUrl,
    isSurveyModalOpen,
    setIsSurveyModalOpen,
    isSurveyActive,
  } as const;
};
