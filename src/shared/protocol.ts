export const REACTION_NAMES = [
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

export type ReactionName = (typeof REACTION_NAMES)[number];

export type FeatureFlags = {
  reactionsEnabled: boolean;
  reachSubmissionEnabled: boolean;
  surveyEnabled: boolean;
  adminWritesEnabled: boolean;
  readOnlyMode: boolean;
};

type BingoNumber = { id: number; number: number };

export type Prize = {
  id: number;
  nameJa: string;
  nameEn: string;
  imageKey: string | null;
  imageUrl: string | null;
  isWon: boolean;
  sortOrder: number;
};

type SurveyState = { active: boolean; url: string };

export type BingoSnapshot = {
  type: "snapshot";
  version: number;
  eventId: string;
  numbers: BingoNumber[];
  latestNumber: number | null;
  reachCount: number;
  survey: SurveyState;
  prizes: Prize[];
  flags: FeatureFlags;
};

type EventType =
  | "number.added"
  | "number.updated"
  | "number.deleted"
  | "numbers.reset"
  | "reach.updated"
  | "reach.reset"
  | "survey.updated"
  | "prizes.updated"
  | "flags.updated"
  | "event.initialized";

export type ServerEvent = {
  type: EventType;
  version: number;
  payload: unknown;
};

export type ReactionEvent = {
  type: "reaction.batch";
  reactions: Array<{ name: ReactionName; at: number }>;
};

export type AdminCommand =
  | { type: "number.add"; number: number }
  | { type: "number.update"; id: number; number: number }
  | { type: "number.delete"; id: number }
  | { type: "numbers.reset" }
  | { type: "reach.increment" }
  | { type: "reach.decrement" }
  | { type: "reach.reset" }
  | { type: "survey.update"; active: boolean; url: string }
  | { type: "prize.create"; prize: Omit<Prize, "id" | "sortOrder"> }
  | {
      type: "prize.update";
      id: number;
      prize: Partial<Omit<Prize, "id" | "sortOrder">>;
      expectedImageKey?: string | null;
    }
  | { type: "prize.delete"; id: number; expectedImageKey?: string | null }
  | { type: "prize.toggleWon"; id: number; isWon: boolean }
  | { type: "prize.reorder"; ids: number[] }
  | { type: "flags.update"; flags: Partial<FeatureFlags> }
  | { type: "event.initialize" };
