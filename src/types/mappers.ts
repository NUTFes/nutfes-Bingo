/**
 * Row Mappers
 * Functions to transform database row types (snake_case) to domain types (camelCase).
 */

import type {
  NumberRow,
  ImageRow,
  PrizeRow,
  ReachLogRow,
  StampTriggerRow,
  EventRow,
} from "./database";
import type { BingoNumber, PrizeImage, Prize, ReachLog, StampTrigger, Event } from "./bingo";

export const mapNumberRow = (row: NumberRow): BingoNumber => ({
  id: row.id,
  number: row.number,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapImageRow = (row: ImageRow): PrizeImage => ({
  id: row.id,
  bucketName: row.bucket_name,
  fileName: row.file_name,
  fileType: row.file_type,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapPrizeRow = (row: PrizeRow): Prize => {
  const image = Array.isArray(row.image) ? row.image[0] : row.image;
  return {
    id: row.id,
    isWon: row.is_won,
    imageId: row.image_id,
    nameJp: row.name_jp,
    nameEn: row.name_en,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    image: image ? mapImageRow(image) : null,
  };
};

export const mapReachLogRow = (row: ReachLogRow): ReachLog => ({
  id: row.id,
  status: row.status,
  createdAt: row.created_at,
  reachNum: row.reach_num,
});

export const mapStampTriggerRow = (row: StampTriggerRow): StampTrigger => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

export const mapEventRow = (row: EventRow): Event => ({
  id: row.id,
  surveyUrl: row.survey_url,
  isSurveyActive: row.is_survey_active,
});
