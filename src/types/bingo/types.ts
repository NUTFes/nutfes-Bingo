export {
  type AppStateRow,
  type NumberRow,
  type PrizeRow as PrizeWithImageUrl,
  type ReachLogRow,
  type StampName,
} from "../../../shared/bingo-transport";

import type { AppStateRow } from "../../../shared/bingo-transport";

export const EMPTY_APP_STATE: AppStateRow = {
  id: 1,
  event_id: "",
  survey_url: "",
  survey_title: "",
  survey_description: "",
  survey_button_label: "",
  is_survey_active: false,
  reach_count: 0,
  updated_at: "",
};
