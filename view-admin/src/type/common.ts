export interface BingoNumber {
  id: number;
  number: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BingoPrize {
  id: number;
  nameJp: string;
  nameEn?: string;
  isWon: boolean;
  imageId: string;
  createdAt?: string;
  updatedAt?: string;
  prizeImage?: PrizeImage[];
}

export interface PrizeImage {
  id: number;
  bucketName: string;
  fileName: string;
  fileType: string;
  createdAt?: string;
  UpdatedAt?: string;
}
