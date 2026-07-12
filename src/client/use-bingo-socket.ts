import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod/v4";

import type { BingoSnapshot, ServerEvent } from "../shared/protocol";
import { bingoSocketMessageSchema, featureFlagsSchema, prizeSchema } from "../shared/schemas";
import { ensureSession, fetchSnapshot } from "./api";

const numberPayloadSchema = z.object({
  id: z.number().int().positive(),
  number: z.number().int().min(1).max(99),
});
const reachPayloadSchema = z.object({ count: z.number().int().nonnegative() });
const surveyPayloadSchema = z.object({ active: z.boolean(), url: z.string() });

export type ConnectionStatus = "connecting" | "online" | "offline";

export function applyEvent(snapshot: BingoSnapshot, event: ServerEvent): BingoSnapshot {
  if (event.version <= snapshot.version) return snapshot;
  if (event.version !== snapshot.version + 1) return snapshot;
  const base = { ...snapshot, version: event.version };
  switch (event.type) {
    case "number.added": {
      const number = numberPayloadSchema.parse(event.payload);
      const numbers = [
        ...snapshot.numbers.filter((item) => item.id !== number.id),
        number,
      ].toSorted((a, b) => a.id - b.id);
      return { ...base, numbers, latestNumber: numbers.at(-1)?.number ?? null };
    }
    case "number.updated": {
      const number = numberPayloadSchema.parse(event.payload);
      const numbers = snapshot.numbers.map((item) => (item.id === number.id ? number : item));
      return { ...base, numbers, latestNumber: numbers.at(-1)?.number ?? null };
    }
    case "number.deleted": {
      const number = numberPayloadSchema.parse(event.payload);
      const numbers = snapshot.numbers.filter((item) => item.id !== number.id);
      return { ...base, numbers, latestNumber: numbers.at(-1)?.number ?? null };
    }
    case "numbers.reset":
      return { ...base, numbers: [], latestNumber: null };
    case "reach.updated":
    case "reach.reset":
      return { ...base, reachCount: reachPayloadSchema.parse(event.payload).count };
    case "survey.updated":
      return { ...base, survey: surveyPayloadSchema.parse(event.payload) };
    case "prizes.updated":
      return { ...base, prizes: z.array(prizeSchema).parse(event.payload) };
    case "flags.updated":
      return { ...base, flags: featureFlagsSchema.parse(event.payload) };
    case "event.initialized": {
      const initialized = bingoSocketMessageSchema.parse(event.payload);
      if (initialized.type !== "snapshot" || initialized.version !== event.version) return snapshot;
      return initialized;
    }
  }
}

export function selectNewerSnapshot(
  current: BingoSnapshot | null,
  next: BingoSnapshot,
): BingoSnapshot {
  return current && next.version < current.version ? current : next;
}

export function useBingoSocket(): {
  snapshot: BingoSnapshot | null;
  status: ConnectionStatus;
  error: string | null;
  refresh: () => Promise<void>;
  replaceSnapshot: (snapshot: BingoSnapshot) => void;
} {
  const [snapshot, setSnapshot] = useState<BingoSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);
  const hasSnapshotRef = useRef(false);
  const snapshotRef = useRef<BingoSnapshot | null>(null);
  const needsFullSnapshotRef = useRef(false);

  const replaceSnapshot = useCallback((next: BingoSnapshot) => {
    const selected = selectNewerSnapshot(snapshotRef.current, next);
    if (selected !== next) return false;
    snapshotRef.current = next;
    versionRef.current = next.version;
    hasSnapshotRef.current = true;
    needsFullSnapshotRef.current = false;
    setSnapshot(next);
    return true;
  }, []);

  const refresh = useCallback(async () => {
    const next = await fetchSnapshot();
    if (replaceSnapshot(next)) setError(null);
  }, [replaceSnapshot]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let heartbeatTimer: number | null = null;
    let attempt = 0;
    let stopped = false;

    const connect = async () => {
      try {
        await ensureSession();
        if (stopped) return;
        setStatus("connecting");
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const resumeQuery =
          hasSnapshotRef.current && !needsFullSnapshotRef.current
            ? `?lastVersion=${versionRef.current}`
            : "";
        socket = new WebSocket(`${protocol}//${location.host}/api/ws${resumeQuery}`);
        socket.addEventListener("open", () => {
          attempt = 0;
          setStatus("online");
          setError(null);
          heartbeatTimer = window.setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN)
              socket.send(JSON.stringify({ type: "ping" }));
          }, 25_000);
        });
        socket.addEventListener("message", (message) => {
          try {
            const parsed = bingoSocketMessageSchema.parse(JSON.parse(String(message.data)));
            if (parsed.type === "snapshot") {
              replaceSnapshot(parsed);
            } else if ("version" in parsed && "payload" in parsed) {
              const current = snapshotRef.current;
              if (current && parsed.version <= current.version) return;
              if (!current || parsed.version !== current.version + 1) {
                needsFullSnapshotRef.current = true;
                hasSnapshotRef.current = false;
                socket?.close(1012, "Full resynchronization required");
                return;
              }
              const next = applyEvent(current, parsed);
              if (next === current) {
                needsFullSnapshotRef.current = true;
                hasSnapshotRef.current = false;
                socket?.close(1012, "Full resynchronization required");
                return;
              }
              replaceSnapshot(next);
            } else if (parsed.type === "error") {
              setError(parsed.message);
            }
          } catch {
            setError("Received an invalid realtime message");
            socket?.close(1003, "Invalid server message");
          }
        });
        socket.addEventListener("close", () => {
          if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
          setStatus("offline");
          if (stopped) return;
          const exponentialDelay = Math.min(30_000, 500 * 2 ** attempt);
          attempt += 1;
          retryTimer = window.setTimeout(
            () => void connect(),
            exponentialDelay * (0.75 + Math.random() * 0.5),
          );
        });
        socket.addEventListener("error", () => socket?.close());
      } catch (connectionError) {
        setStatus("offline");
        setError(connectionError instanceof Error ? connectionError.message : "Connection failed");
        if (!stopped) {
          retryTimer = window.setTimeout(
            () => void connect(),
            Math.min(30_000, 1000 * 2 ** attempt),
          );
          attempt += 1;
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      socket?.close(1000, "Component unmounted");
    };
  }, [refresh, replaceSnapshot]);

  return { snapshot, status, error, refresh, replaceSnapshot };
}
