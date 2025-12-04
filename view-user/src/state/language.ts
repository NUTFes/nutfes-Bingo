import { atom } from "jotai";

export type SupportedLanguage = "ja" | "en";

export const languageState = atom<SupportedLanguage>("ja");
