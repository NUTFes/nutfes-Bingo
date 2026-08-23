import { isImmutablePrizeImagePath, MAX_PRIZE_IMAGE_BYTES, resolveImageUrl } from "./domain";
import { ApiError, applySecurityHeaders, ifNoneMatch, readMultipartForm, sha256Hex } from "./http";

const MULTIPART_OVERHEAD_BYTES = 128 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const IMAGE_CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
const IMMUTABLE_IMAGE_KEY = /^prizes\/([a-f0-9]{64})\.(jpg|png|webp)$/;

export async function uploadPrizeImage(
  request: Request,
  env: Env,
): Promise<{ image_path: string; image_url: string }> {
  const form = await readMultipartForm(request, MAX_PRIZE_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES);
  const entry = form.get("file");
  if (!(entry instanceof File) || entry.size === 0) {
    throw new ApiError(400, "景品画像を選択してください。");
  }
  if (entry.size > MAX_PRIZE_IMAGE_BYTES) {
    throw new ApiError(413, "景品画像は2MB以下にしてください。");
  }

  const extension = IMAGE_TYPES[entry.type as keyof typeof IMAGE_TYPES];
  if (extension === undefined) {
    throw new ApiError(415, "景品画像は JPEG / PNG / WebP のみ許可します。");
  }
  const prefix = new Uint8Array(await entry.slice(0, 12).arrayBuffer());
  if (!hasValidSignature(entry.type, prefix)) {
    throw new ApiError(415, "景品画像のファイル形式が不正です。");
  }

  const bytes = new Uint8Array(await entry.arrayBuffer());
  const digest = await sha256Hex(bytes);
  const key = `prizes/${digest}.${extension}`;
  const existing = await env.PRIZE_IMAGES.head(key);
  const existingContentType = existing?.httpMetadata?.contentType;
  if (
    existing === null ||
    existing.size !== bytes.byteLength ||
    !hasManagedSha256(existing, digest) ||
    existingContentType !== entry.type
  ) {
    await env.PRIZE_IMAGES.put(key, bytes, {
      httpMetadata: {
        contentType: entry.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        checksum_sha256: digest,
        uploaded_at: new Date().toISOString(),
      },
      sha256: digest,
    });
  }

  return {
    image_path: key,
    image_url: resolveImageUrl(key, env.MEDIA_ORIGIN) ?? `/api/prize-images/${key}`,
  };
}

export async function servePrizeImage(request: Request, env: Env, key: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new ApiError(405, "許可されていないHTTPメソッドです。");
  }
  if (!isImmutablePrizeImagePath(key)) throw new ApiError(404, "画像が見つかりません。");
  const keyParts = IMMUTABLE_IMAGE_KEY.exec(key);
  if (keyParts === null) throw new ApiError(404, "画像が見つかりません。");
  const [, digest, extension] = keyParts;
  const contentType = IMAGE_CONTENT_TYPES[extension as keyof typeof IMAGE_CONTENT_TYPES];

  let object: R2Object | null;
  let body: ReadableStream | null = null;
  if (request.method === "HEAD") {
    object = await env.PRIZE_IMAGES.head(key);
  } else {
    const objectBody = await env.PRIZE_IMAGES.get(key);
    object = objectBody;
    body = objectBody?.body ?? null;
  }
  if (object === null) throw new ApiError(404, "画像が見つかりません。");
  if (
    object.size <= 0 ||
    object.size > MAX_PRIZE_IMAGE_BYTES ||
    digest === undefined ||
    !hasManagedSha256(object, digest)
  ) {
    throw new ApiError(500, "景品画像の整合性を確認できません。");
  }

  const headers = new Headers({
    "Content-Type": contentType,
    ETag: object.httpEtag,
    "Content-Length": String(object.size),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "same-site",
  });
  applySecurityHeaders(headers);
  if (ifNoneMatch(request, object.httpEtag)) return new Response(null, { status: 304, headers });

  return new Response(body, { status: 200, headers });
}

function hasManagedSha256(object: R2Object, expectedHex: string): boolean {
  const checksum = object.checksums.sha256;
  if (checksum === undefined) return false;
  const actualHex = Array.from(new Uint8Array(checksum), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return actualHex === expectedHex;
}

function hasValidSignature(type: string, bytes: Uint8Array): boolean {
  switch (type) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes.length >= 12 &&
        String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
      );
    default:
      return false;
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}
