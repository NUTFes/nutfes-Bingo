export {
  STAMP_NAMES,
  type AppStateRow,
  type NumberRow,
  type PrizeRow as PrizeWithImageUrl,
  type ReachLogRow,
  type StampName,
} from "../../../shared/bingo-transport";

import type { AppStateRow } from "../../../shared/bingo-transport";

export const EMPTY_APP_STATE: AppStateRow = {
  id: 1,
  survey_url: "",
  is_survey_active: false,
  reach_count: 0,
  updated_at: "",
};
