export const PRIZE_IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PRIZE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validatePrizeImage(file: File): string | null {
  if (file.size === 0) return "空の画像ファイルは登録できません。";
  if (!PRIZE_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
    return "景品画像は JPEG / PNG / WebP のみ選択できます。";
  }
  if (file.size > PRIZE_IMAGE_MAX_BYTES) return "景品画像は5 MiB以下にしてください。";
  return null;
}
