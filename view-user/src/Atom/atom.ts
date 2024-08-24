import { atom } from "recoil";
import type { GetListPrizesQuery } from "@/type/graphql";
import { create } from "domain";
import { updateContextWithCliFlags } from "@graphql-codegen/cli";

export const bingoPrizeState = atom<GetListPrizesQuery["prizes"]>({
  key: "bingoPrizeState",
  default: [
    {
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
    },
  ],
});
