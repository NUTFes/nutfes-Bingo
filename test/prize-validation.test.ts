import { describe, expect, it } from "vitest";

import {
  MAX_PRIZE_IMAGE_BYTES,
  PRIZE_NAME_EN_MAX_LENGTH,
  PRIZE_NAME_JP_MAX_LENGTH,
} from "../shared/bingo-constraints";
import { validatePrizeImage, validatePrizeInput } from "../src/features/admin/prizes/validation";

describe("prize client validation", () => {
  it("accepts trimmed names and a supported image within the size limit", () => {
    expect(
      validatePrizeInput({
        nameJp: " 景品 ",
        nameEn: " Prize ",
        file: { size: MAX_PRIZE_IMAGE_BYTES, type: "image/webp" },
      }),
    ).toBeNull();
  });

  it("requires a Japanese name and enforces both name limits", () => {
    expect(validatePrizeInput({ nameJp: "  ", nameEn: "" })).toBe("景品名を入力してください。");
    expect(
      validatePrizeInput({ nameJp: "景".repeat(PRIZE_NAME_JP_MAX_LENGTH + 1), nameEn: "" }),
    ).toBe(`景品名（日本語）は${PRIZE_NAME_JP_MAX_LENGTH}文字以下にしてください。`);
    expect(
      validatePrizeInput({ nameJp: "景品", nameEn: "a".repeat(PRIZE_NAME_EN_MAX_LENGTH + 1) }),
    ).toBe(`景品名（英語）は${PRIZE_NAME_EN_MAX_LENGTH}文字以下にしてください。`);
  });

  it("rejects empty, unsupported, and oversized image files", () => {
    expect(validatePrizeImage({ size: 0, type: "image/png" })).toBe(
      "空の画像ファイルは登録できません。",
    );
    expect(validatePrizeImage({ size: 1, type: "image/gif" })).toBe(
      "景品画像は JPEG / PNG / WebP のみ選択できます。",
    );
    expect(validatePrizeImage({ size: MAX_PRIZE_IMAGE_BYTES + 1, type: "image/jpeg" })).toBe(
      "景品画像は5 MiB以下にしてください。",
    );
  });
});
