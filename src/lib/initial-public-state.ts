import { resolvePrizeImageUrl } from "@/utils/image";
import {
  canTransformResponsiveImage,
  getResponsiveImageSrc,
  getResponsiveImageSrcSet,
  PRIZE_IMAGE_SIZES,
} from "@/utils/responsive-image";

const PUBLIC_STATE_URL = "/api/bingo/state";
const IMAGE_PRELOAD_ATTRIBUTE = "data-initial-prize-image";

let initialRequest: Promise<{ data: unknown; etag: string | null }> | undefined;
let requestController: AbortController | undefined;
let requestConsumed = false;
let shouldPreloadFirstPrize = false;

function firstPrizeImageUrl(data: unknown): string | null {
  let value = data;
  if (typeof value === "object" && value !== null && "data" in value) value = value.data;
  if (
    typeof value !== "object" ||
    value === null ||
    !("prizes" in value) ||
    !Array.isArray(value.prizes)
  ) {
    return null;
  }

  for (const prize of value.prizes) {
    if (
      typeof prize !== "object" ||
      prize === null ||
      !("id" in prize) ||
      typeof prize.id !== "number" ||
      !("name_jp" in prize) ||
      typeof prize.name_jp !== "string"
    ) {
      continue;
    }
    const imageUrl =
      "image_url" in prize && typeof prize.image_url === "string"
        ? prize.image_url
        : resolvePrizeImageUrl(
            "image_path" in prize && typeof prize.image_path === "string" ? prize.image_path : null,
          );
    return imageUrl;
  }

  return null;
}

function preloadFirstPrizeImage(data: unknown) {
  if (!shouldPreloadFirstPrize || typeof document === "undefined") return;

  try {
    const imageUrl = firstPrizeImageUrl(data);
    if (imageUrl === null || imageUrl.length === 0) return;

    const head = document.head;
    if (head === null || head.querySelector(`link[${IMAGE_PRELOAD_ATTRIBUTE}]`) !== null) return;

    const transformed = canTransformResponsiveImage(imageUrl);
    const src = getResponsiveImageSrc(imageUrl, transformed);
    const srcSet = getResponsiveImageSrcSet(imageUrl, transformed);
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    link.setAttribute("fetchpriority", "high");
    if (srcSet !== undefined) {
      link.setAttribute("imagesrcset", srcSet);
      link.setAttribute("imagesizes", PRIZE_IMAGE_SIZES);
    }
    link.setAttribute(IMAGE_PRELOAD_ATTRIBUTE, "");
    head.appendChild(link);
  } catch {
    // An optional image preload must not prevent the authoritative state from reaching its consumer.
  }
}

export function primeInitialPublicState(): void {
  if (requestConsumed || initialRequest !== undefined) return;
  shouldPreloadFirstPrize =
    typeof window !== "undefined" &&
    (window.location.pathname === "/prizes" || window.location.pathname === "/prizes/");
  requestController = new AbortController();

  let responsePromise: Promise<Response>;
  try {
    responsePromise = fetch(PUBLIC_STATE_URL, {
      cache: "no-cache",
      credentials: "same-origin",
      headers: new Headers({ Accept: "application/json" }),
      signal: requestController.signal,
    });
  } catch (error) {
    responsePromise = Promise.reject(error);
  }

  initialRequest = responsePromise.then(async (response) => {
    if (!response.ok) {
      throw new Error(`ビンゴ状態の取得に失敗しました (${response.status})`);
    }

    const data: unknown = await response.json();
    preloadFirstPrizeImage(data);
    return { data, etag: response.headers.get("ETag") };
  });
  void initialRequest.catch(() => undefined);
}

export function takeInitialPublicState(
  signal: AbortSignal,
): Promise<{ data: unknown; etag: string | null }> | undefined {
  if (signal.aborted) return undefined;
  primeInitialPublicState();
  if (requestConsumed || initialRequest === undefined) return undefined;
  const request = initialRequest;
  const controller = requestController;
  requestConsumed = true;
  initialRequest = undefined;
  requestController = undefined;
  const onAbort = () => controller?.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();

  return request.then(
    (snapshot) => {
      signal.removeEventListener("abort", onAbort);
      signal.throwIfAborted();
      return snapshot;
    },
    (error: unknown) => {
      signal.removeEventListener("abort", onAbort);
      throw error;
    },
  );
}
