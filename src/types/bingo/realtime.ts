import type { BingoUnifiedState } from "@shared/bingo-transport";

import { EMPTY_APP_STATE } from "@/types/bingo/types";

export const EMPTY_BINGO_STATE = {
  revision: 0,
  numbers: [],
  prizes: [],
  appState: EMPTY_APP_STATE,
  latestReachLog: null,
  serverTime: "",
} satisfies BingoUnifiedState;
