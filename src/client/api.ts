import type { ZodType } from "zod/v4";

import type { AdminCommand, BingoSnapshot } from "../shared/protocol";
import {
  adminSessionSchema,
  bingoSnapshotSchema,
  errorResponseSchema,
  reachResponseSchema,
  sessionResponseSchema,
} from "../shared/schemas";

const ADMIN_TOKEN_KEY = "nutfes-bingo.admin-token";

function adminHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function parseResponse<T>(response: Response, schema: ZodType<T>): Promise<T> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(data);
    throw new Error(
      parsedError.success ? parsedError.data.error : `Request failed with ${response.status}`,
    );
  }
  return schema.parse(data);
}

export function setLocalAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export async function ensureSession(): Promise<{ reactionShards: number }> {
  return parseResponse(
    await fetch("/api/session", { credentials: "same-origin" }),
    sessionResponseSchema,
  );
}

export async function fetchSnapshot(): Promise<BingoSnapshot> {
  return parseResponse(await fetch("/api/state", { cache: "no-store" }), bingoSnapshotSchema);
}

export async function submitReach(): Promise<{ accepted: boolean; count: number }> {
  return parseResponse(
    await fetch("/api/reach", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    }),
    reachResponseSchema,
  );
}

export async function verifyAdmin(): Promise<void> {
  await parseResponse(
    await fetch("/api/admin/session", { headers: adminHeaders(), cache: "no-store" }),
    adminSessionSchema,
  );
}

export async function sendAdminCommand(command: AdminCommand): Promise<BingoSnapshot> {
  return parseResponse(
    await fetch("/api/admin/command", {
      method: "POST",
      credentials: "same-origin",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(command),
    }),
    bingoSnapshotSchema,
  );
}

export async function savePrize(form: FormData, id?: number): Promise<BingoSnapshot> {
  return parseResponse(
    await fetch(id ? `/api/admin/prizes/${id}` : "/api/admin/prizes", {
      method: id ? "PUT" : "POST",
      credentials: "same-origin",
      headers: adminHeaders(),
      body: form,
    }),
    bingoSnapshotSchema,
  );
}

export async function deletePrize(id: number): Promise<BingoSnapshot> {
  return parseResponse(
    await fetch(`/api/admin/prizes/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: adminHeaders(),
    }),
    bingoSnapshotSchema,
  );
}
