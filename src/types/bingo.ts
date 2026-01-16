/**
 * Application Domain Types (camelCase)
 * These types represent the transformed data used in the frontend application.
 */

export type BingoNumber = {
  id: number;
  number: number;
  createdAt: string;
  updatedAt: string;
};

export type PrizeImage = {
  id: number;
  bucketName: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  updatedAt: string;
};

export type Prize = {
  id: number;
  isWon: boolean;
  imageId: number;
  nameJp: string;
  nameEn: string | null;
  createdAt: string;
  updatedAt: string;
  image?: PrizeImage | null;
};

export type ReachLog = {
  id: number;
  status: boolean;
  createdAt: string;
  reachNum: number;
};

export type StampTrigger = {
  id: number;
  name: string;
  createdAt?: string | null;
};

export type Event = {
  id: number;
  surveyUrl: string;
  isSurveyActive: boolean;
};
