import {
  MAX_PRIZE_IMAGE_BYTES,
  PRIZE_IMAGE_EXTENSION_BY_MIME_TYPE,
  PRIZE_NAME_EN_MAX_LENGTH,
  PRIZE_NAME_JP_MAX_LENGTH,
} from "../../../../shared/bingo-constraints";

type PrizeImageMetadata = Pick<File, "size" | "type">;

type PrizeInput = {
  nameJp: string;
  nameEn: string;
  file?: PrizeImageMetadata | null;
};

export function validatePrizeImage(file: PrizeImageMetadata): string | null {
  if (file.size === 0) return "空の画像ファイルは登録できません。";
  if (!Object.hasOwn(PRIZE_IMAGE_EXTENSION_BY_MIME_TYPE, file.type)) {
    return "景品画像は JPEG / PNG / WebP のみ選択できます。";
  }
  if (file.size > MAX_PRIZE_IMAGE_BYTES) return "景品画像は5 MiB以下にしてください。";
  return null;
}

export function validatePrizeInput({ nameJp, nameEn, file }: PrizeInput): string | null {
  const normalizedNameJp = nameJp.trim();
  const normalizedNameEn = nameEn.trim();

  if (!normalizedNameJp) return "景品名を入力してください。";
  if (normalizedNameJp.length > PRIZE_NAME_JP_MAX_LENGTH) {
    return `景品名（日本語）は${PRIZE_NAME_JP_MAX_LENGTH}文字以下にしてください。`;
  }
  if (normalizedNameEn.length > PRIZE_NAME_EN_MAX_LENGTH) {
    return `景品名（英語）は${PRIZE_NAME_EN_MAX_LENGTH}文字以下にしてください。`;
  }
  return file ? validatePrizeImage(file) : null;
}
