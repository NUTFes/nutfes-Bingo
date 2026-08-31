export const MIN_BINGO_NUMBER = 1;
export const MAX_BINGO_NUMBER = 99;

export const MAX_PRIZES = 100;
export const PRIZE_NAME_JP_MAX_LENGTH = 120;
export const PRIZE_NAME_EN_MAX_LENGTH = 160;
export const MAX_PRIZE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PRIZE_IMAGE_EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type PrizeImageMimeType = keyof typeof PRIZE_IMAGE_EXTENSION_BY_MIME_TYPE;
export const PRIZE_IMAGE_MIME_TYPES = Object.keys(
  PRIZE_IMAGE_EXTENSION_BY_MIME_TYPE,
) as PrizeImageMimeType[];

export const MAX_SURVEY_URL_LENGTH = 2_048;
export const MAX_SURVEY_TITLE_LENGTH = 200;
export const MAX_SURVEY_DESCRIPTION_LENGTH = 2_000;
export const MAX_SURVEY_BUTTON_LABEL_LENGTH = 100;
