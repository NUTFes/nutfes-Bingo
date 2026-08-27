export const STAMP_NAMES = [
  "angry",
  "cracker",
  "crap",
  "good",
  "heart",
  "peace",
  "sad",
  "skull",
  "smile",
  "surprise",
] as const;

export type StampName = (typeof STAMP_NAMES)[number];

export type NumberRow = {
  id: number;
  number: number;
  created_at: string;
  updated_at: string;
};

export type PrizeRow = {
  id: number;
  name_jp: string;
  name_en: string | null;
  image_path: string | null;
  image_url: string | null;
  is_won: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AppStateRow = {
  id: number;
  event_id: string;
  survey_url: string;
  survey_title: string;
  survey_description: string;
  survey_button_label: string;
  is_survey_active: boolean;
  reach_count: number;
  updated_at: string;
};

export type ReachLogRow = {
  id: number;
  delta: number;
  reach_num: number;
  source: string;
  created_at: string;
};

export type BingoUnifiedState = {
  revision: number;
  numbers: NumberRow[];
  prizes: PrizeRow[];
  appState: AppStateRow;
  latestReachLog: ReachLogRow | null;
  serverTime: string;
};

export type StateSocketMessage =
  | { type: "state"; state: BingoUnifiedState }
  | {
      type: "reach";
      revision: number;
      reachCount: number;
      latestReachLog: ReachLogRow;
      serverTime: string;
    };

export type StampEvent = {
  id: string | number;
  name: StampName;
  created_at: string;
};

export type StampSocketMessage = { type: "ready" } | { type: "stamp"; stamp: StampEvent };

export type AdminCommand =
  | { type: "createNumber"; number: number }
  | { type: "deleteNumber"; number: number }
  | { type: "updateNumber"; id: number; number: number }
  | { type: "incrementReach" }
  | { type: "decrementReach" }
  | {
      type: "saveSurveyState";
      surveyUrl: string;
      surveyTitle: string;
      surveyDescription: string;
      surveyButtonLabel: string;
      isSurveyActive: boolean;
    }
  | {
      type: "startAnnualEvent";
      expectedRevision: number;
      expectedEventId: string;
      newEventId: string;
    }
  | { type: "createPrize"; nameJp: string; nameEn: string; imagePath?: string }
  | { type: "updatePrize"; id: number; nameJp: string; nameEn: string; imagePath?: string }
  | { type: "togglePrizeWon"; id: number; isWon: boolean }
  | { type: "reorderPrizeGroup"; orderedIds: number[] }
  | { type: "deletePrize"; id: number };
