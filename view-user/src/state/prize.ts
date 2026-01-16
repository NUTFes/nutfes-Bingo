import { atom } from "recoil";
import type { Prize } from "@/lib/supabase";

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

export const bingoPrizeState = atom<Prize[]>({
  key: "bingoPrizeState",
  default: [defaultPrize],
});
