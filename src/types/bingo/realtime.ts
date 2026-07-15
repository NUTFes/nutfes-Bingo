import type {
  AppStateRow,
  NumberRow,
  PrizeWithImageUrl,
  ReachLogRow,
  StampName,
} from "@/types/bingo/types";

export type BingoUnifiedState = {
  generation: string;
  revision: number;
  numbers: NumberRow[];
  prizes: PrizeWithImageUrl[];
  appState: AppStateRow;
  latestReachLog: ReachLogRow | null;
  serverTime: string;
};

export type StateSocketMessage =
  | {
      type: "state";
      state: BingoUnifiedState;
    }
  | {
      type: "reach";
      generation: string;
      revision: number;
      reachCount: number;
      latestReachLog: ReachLogRow;
      serverTime: string;
    }
  | {
      type: "generation";
      generation: string;
    };

export type StampEvent = {
  id: string | number;
  name: StampName;
  created_at: string;
};

export type StampSocketMessage =
  | {
      type: "ready";
    }
  | {
      type: "stamp";
      stamp: StampEvent;
    };
