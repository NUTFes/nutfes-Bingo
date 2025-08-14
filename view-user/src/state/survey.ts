import { atom } from "recoil";

export const hasShownSurveyState = atom<boolean>({
  key: "hasShownSurvey",
  default: false,
});
