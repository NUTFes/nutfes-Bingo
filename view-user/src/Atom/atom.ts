import { atom } from "recoil";
import type { GetListPrizesQuery } from "@/types/graphql";

const defaultPrize = {
  id: 0,
  nameJp: "",
  nameEn: "",
  isWon: false,
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

export const bingoPrizeState = atom<GetListPrizesQuery["prizes"]>({
  key: "bingoPrizeState",
  default: [defaultPrize],
});
