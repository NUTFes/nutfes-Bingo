import { ValidationError } from "../shared/validation";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ImageFormat = {
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

export function validatePrizeImage(bytes: Uint8Array, suppliedType: string): ImageFormat {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ValidationError("Prize image must be between 1 byte and 2 MiB");
  }

  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const webp =
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";

  const format: ImageFormat | null = jpeg
    ? { extension: "jpg", contentType: "image/jpeg" }
    : png
      ? { extension: "png", contentType: "image/png" }
      : webp
        ? { extension: "webp", contentType: "image/webp" }
        : null;
  if (!format || suppliedType.toLowerCase() !== format.contentType) {
    throw new ValidationError("Image MIME type and signature must match JPEG, PNG, or WebP");
  }
  return format;
}

export async function uploadPrizeImage(file: File, bucket: R2Bucket): Promise<string> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ValidationError("Prize image must be between 1 byte and 2 MiB");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = validatePrizeImage(bytes, file.type);
  const key = `prizes/${crypto.randomUUID()}.${format.extension}`;
  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: format.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  return key;
}
