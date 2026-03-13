// Database row types (snake_case - as returned by Supabase)
export type {
  NumberRow,
  ImageRow,
  PrizeRow,
  ReachLogRow,
  StampTriggerRow,
  EventRow,
} from "./database";

// Application domain types (camelCase - used in frontend)
export type { BingoNumber, PrizeImage, Prize, ReachLog, StampTrigger, Event } from "./bingo";

// Row mappers (database → domain)
export {
  mapNumberRow,
  mapImageRow,
  mapPrizeRow,
  mapReachLogRow,
  mapStampTriggerRow,
  mapEventRow,
} from "./mappers";
