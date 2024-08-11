import { atom } from "recoil";
import { BingoPrize } from "@/type/common";

export const bingoPrizeState = atom<BingoPrize[]>({
  key: "bingoPrizeState",
  default: [
    {
      id: 0,
      nameJp: "",
      nameEn: "",
      isWon: false,
      imageId: 0,
      createdAt: "",
      updatedAt: "",
    },
  ],
});
