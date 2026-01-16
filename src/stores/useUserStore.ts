import { create } from "zustand";
import type { Prize } from "@/types";

export type SupportedLanguage = "ja" | "en";

interface UserState {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  hasShownSurvey: boolean;
  setHasShownSurvey: (value: boolean) => void;
  bingoPrize: Prize[];
  setBingoPrize: (value: Prize[]) => void;
}

const defaultPrize: Prize = {
  id: 0,
  nameJp: "",
  nameEn: "",
  isWon: false,
  imageId: 0,
  image: {
    id: 0,
    bucketName: "",
    fileName: "",
    fileType: "",
    createdAt: "",
    updatedAt: "",
  },
  createdAt: "",
  updatedAt: "",
};

export const useUserStore = create<UserState>((set) => ({
  language: "ja",
  setLanguage: (language) => set({ language }),
  hasShownSurvey: false,
  setHasShownSurvey: (value) => set({ hasShownSurvey: value }),
  bingoPrize: [defaultPrize],
  setBingoPrize: (value) => set({ bingoPrize: value }),
}));
