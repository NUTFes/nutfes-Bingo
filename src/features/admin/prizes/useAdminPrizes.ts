import { useEffect, useReducer, type SetStateAction } from "react";

import { queue } from "@/components/ui/toastQueue";
import { fetchAdminState } from "@/lib/admin-api";
import type { PrizeWithImageUrl } from "@/types/bingo/types";

interface AdminPrizesLoadState {
  bingoPrize: PrizeWithImageUrl[];
  loadError: string | null;
  isLoaded: boolean;
}

type AdminPrizesLoadAction =
  | { type: "load-success"; prizes: PrizeWithImageUrl[] }
  | { type: "load-error"; message: string }
  | { type: "set-prizes"; value: SetStateAction<PrizeWithImageUrl[]> };

const adminPrizesLoadReducer = (
  state: AdminPrizesLoadState,
  action: AdminPrizesLoadAction,
): AdminPrizesLoadState => {
  switch (action.type) {
    case "load-success":
      return { bingoPrize: action.prizes, loadError: null, isLoaded: true };
    case "load-error":
      return { ...state, loadError: action.message };
    case "set-prizes":
      return {
        ...state,
        bingoPrize:
          typeof action.value === "function" ? action.value(state.bingoPrize) : action.value,
      };
  }
};

const LOAD_ERROR_MESSAGE =
  "景品データを取得できませんでした。接続を確認して再読み込みしてください。";
const TOAST_TIMEOUT = 5000;

export function useAdminPrizes() {
  const [{ bingoPrize, loadError, isLoaded }, dispatchLoadState] = useReducer(
    adminPrizesLoadReducer,
    {
      bingoPrize: [],
      loadError: null,
      isLoaded: false,
    },
  );

  const setBingoPrize = (value: SetStateAction<PrizeWithImageUrl[]>) => {
    dispatchLoadState({ type: "set-prizes", value });
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchAdminState(controller.signal)
      .then((state) => {
        dispatchLoadState({ type: "load-success", prizes: state.prizes });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
          dispatchLoadState({ type: "load-error", message: LOAD_ERROR_MESSAGE });
          queue.add(
            { title: "読込失敗", description: "景品データを取得できませんでした。" },
            { timeout: TOAST_TIMEOUT },
          );
        }
      });
    return () => controller.abort();
  }, []);

  return { bingoPrize, setBingoPrize, loadError, isLoaded };
}
