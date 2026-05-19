import type {
  AppStateRow,
  NumberRow,
  PrizeWithImageUrl,
  ReachLogRow,
  StampTriggerRow,
} from "@/types/bingo/types";

export type BingoStateResponse = {
  numbers: NumberRow[];
  appState: AppStateRow;
  serverTime: string;
};

export type PrizeStateResponse = {
  prizes: PrizeWithImageUrl[];
  appState: AppStateRow;
  serverTime: string;
};

export type ScreenStateResponse = {
  numbers: NumberRow[];
  latestReachLog: ReachLogRow | null;
  serverTime: string;
};

export type StampEventsResponse = {
  stamps: StampTriggerRow[];
  nextCursor: number;
  serverTime: string;
};
