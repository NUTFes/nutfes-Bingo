import { atom } from "recoil";

export const bingoPrizeState = atom({
  key: "bingoPrizeState",
  default: [{ id: 0, name: "", existing: false, image: "" }],
});
