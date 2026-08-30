import type { BingoUnifiedState } from "@shared/bingo-transport";

import { EMPTY_APP_STATE } from "@/types/bingo/types";

export function createEmptyBingoState(): BingoUnifiedState {
  return {
    revision: 0,
    numbers: [],
    prizes: [],
    appState: EMPTY_APP_STATE,
    latestReachLog: null,
    serverTime: "",
  };
}
