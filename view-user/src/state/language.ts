import { atom } from "recoil";

export type SupportedLanguage = "ja" | "en";

export const languageState = atom<SupportedLanguage>({
  key: "languageState",
  default: "ja",
});
