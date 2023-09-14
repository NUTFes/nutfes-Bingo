import { BingoNumber } from "@/utils/api_methods";
import { atom } from "recoil";
import { recoilPersist } from "recoil-persist";

const { persistAtom } = recoilPersist({
  key: "recoil-persist",
  storage: typeof window === "undefined" ? undefined : window.localStorage,
});
export const bingoNumbersState = atom<BingoNumber[]>({
  key: "bingoNumbersState",
  default: [],
  effects_UNSTABLE: [persistAtom], // 永続化を有効
});
