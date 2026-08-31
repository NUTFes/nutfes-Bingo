import { createContext, use, useMemo, useState } from "react";

import { en } from "@/utils/i18n/en";
import { ja } from "@/utils/i18n/ja";

export type SupportedLanguage = "ja" | "en";
type Translations = typeof ja;

interface BingoLanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: Translations;
}

const STORAGE_KEY = "bingo-language";

const BingoLanguageContext = createContext<BingoLanguageContextValue | null>(null);

export function BingoLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "ja" || stored === "en" ? stored : "ja";
  });

  const value = useMemo<BingoLanguageContextValue>(() => {
    const setLanguage = (nextLanguage: SupportedLanguage) => {
      setLanguageState(nextLanguage);
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    };

    return {
      language,
      setLanguage,
      t: language === "ja" ? ja : en,
    };
  }, [language]);

  return <BingoLanguageContext.Provider value={value}>{children}</BingoLanguageContext.Provider>;
}

export function useBingoLanguage() {
  const context = use(BingoLanguageContext);

  if (!context) {
    throw new Error("useBingoLanguage must be used inside BingoLanguageProvider");
  }

  return context;
}
