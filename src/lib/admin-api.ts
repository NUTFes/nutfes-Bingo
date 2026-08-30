import type { AdminCommand, BingoUnifiedState } from "@shared/bingo-transport";
import { normalizeBingoState } from "@/lib/realtime";
import { createEmptyBingoState } from "@/types/bingo/realtime";

export type { AdminCommand } from "@shared/bingo-transport";

type DataResponse<T> = { data: T };

const ADMIN_COMMAND_TIMEOUT_MS = 15_000;
const ADMIN_STATE_TIMEOUT_MS = 15_000;
const ADMIN_UPLOAD_TIMEOUT_MS = 30_000;

const EMPTY_STATE: BingoUnifiedState = createEmptyBingoState();

async function parseDataResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (Partial<DataResponse<T>> & { error?: unknown })
    | null;

  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `管理APIへのリクエストに失敗しました (${response.status})`,
    );
  }
  if (!body || !("data" in body)) {
    throw new Error("管理APIのレスポンス形式が不正です。");
  }
  return body.data as T;
}

export async function fetchAdminState(signal?: AbortSignal) {
  const timeoutSignal = AbortSignal.timeout(ADMIN_STATE_TIMEOUT_MS);
  const response = await fetch("/admin/api/state", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
  });
  const data = await parseDataResponse<unknown>(response);
  return normalizeBingoState(data, EMPTY_STATE);
}

export async function sendAdminCommand<T>(command: AdminCommand) {
  const response = await fetch("/admin/api/command", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(ADMIN_COMMAND_TIMEOUT_MS),
  });
  return parseDataResponse<T>(response);
}

export async function uploadPrizeImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/admin/api/images", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    body: formData,
    signal: AbortSignal.timeout(ADMIN_UPLOAD_TIMEOUT_MS),
  });
  return parseDataResponse<{ image_path: string; image_url: string }>(response);
}
