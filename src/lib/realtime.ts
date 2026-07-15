"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BingoUnifiedState,
  StampEvent,
  StampSocketMessage,
  StateSocketMessage,
} from "@/types/bingo/realtime";
import {
  EMPTY_APP_STATE,
  STAMP_NAMES,
  type AppStateRow,
  type NumberRow,
  type PrizeWithImageUrl,
  type ReachLogRow,
  type StampName,
} from "@/types/bingo/types";
import { resolvePrizeImageUrl } from "@/utils/image";

const PUBLIC_STATE_URL = "/api/bingo/state";
const PUBLIC_STATE_SOCKET_PATH = "/api/bingo/socket";
const SCREEN_STATE_URL = "/screen/api/state";
const SCREEN_STATE_SOCKET_PATH = "/screen/api/socket";
const SCREEN_STAMP_SOCKET_PATH = "/screen/api/stamps/socket";
const FALLBACK_VISIBLE_MS = 15_000;
const FALLBACK_HIDDEN_MS = 30_000;
const MAX_RECONNECT_MS = 30_000;
const MAX_FALLBACK_MS = 5 * 60_000;
const STABLE_CONNECTION_MS = 60_000;
const SCREEN_RECOVERY_MS = 5 * 60_000;
const MAX_RECONNECT_ATTEMPTS = 8;
const MAX_FALLBACK_ATTEMPTS = 6;
const FETCH_TIMEOUT_MS = 8_000;
const SCREEN_ACCESS_RECHECK_MS = 30 * 60_000;

class ScreenAccessExpiredError extends Error {}

function createEmptyState(input?: {
  numbers?: NumberRow[];
  prizes?: PrizeWithImageUrl[];
  appState?: AppStateRow;
  latestReachLog?: ReachLogRow | null;
}): BingoUnifiedState {
  return {
    generation: "",
    revision: 0,
    numbers: input?.numbers ?? [],
    prizes: input?.prizes ?? [],
    appState: input?.appState ?? EMPTY_APP_STATE,
    latestReachLog: input?.latestReachLog ?? null,
    serverTime: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePrize(value: unknown): PrizeWithImageUrl | null {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.name_jp !== "string") {
    return null;
  }

  const imagePath = typeof value.image_path === "string" ? value.image_path : null;
  const imageUrl = typeof value.image_url === "string" ? value.image_url : null;

  return {
    id: value.id,
    name_jp: value.name_jp,
    name_en: typeof value.name_en === "string" ? value.name_en : null,
    image_path: imagePath,
    image_url: imageUrl ?? resolvePrizeImageUrl(imagePath),
    is_won: value.is_won === true,
    sort_order: typeof value.sort_order === "number" ? value.sort_order : 0,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : "",
  };
}

function normalizeAppState(value: unknown, fallback: AppStateRow): AppStateRow {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    id: typeof value.id === "number" ? value.id : fallback.id,
    survey_url: typeof value.survey_url === "string" ? value.survey_url : fallback.survey_url,
    is_survey_active:
      typeof value.is_survey_active === "boolean"
        ? value.is_survey_active
        : fallback.is_survey_active,
    reach_count: typeof value.reach_count === "number" ? value.reach_count : fallback.reach_count,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : fallback.updated_at,
  };
}

export function normalizeBingoState(value: unknown, fallback: BingoUnifiedState) {
  const wrappedValue = isRecord(value) && "data" in value ? value.data : value;
  if (!isRecord(wrappedValue)) {
    throw new Error("ビンゴ状態のレスポンス形式が不正です。");
  }

  const numbers = Array.isArray(wrappedValue.numbers)
    ? wrappedValue.numbers.filter(
        (number): number is NumberRow =>
          isRecord(number) && typeof number.id === "number" && typeof number.number === "number",
      )
    : fallback.numbers;
  const prizes = Array.isArray(wrappedValue.prizes)
    ? wrappedValue.prizes.map(normalizePrize).filter((prize) => prize !== null)
    : fallback.prizes;

  return {
    generation:
      typeof wrappedValue.generation === "string" ? wrappedValue.generation : fallback.generation,
    revision: typeof wrappedValue.revision === "number" ? wrappedValue.revision : fallback.revision,
    numbers,
    prizes,
    appState: normalizeAppState(wrappedValue.appState, fallback.appState),
    latestReachLog:
      wrappedValue.latestReachLog === null || isRecord(wrappedValue.latestReachLog)
        ? (wrappedValue.latestReachLog as ReachLogRow | null)
        : fallback.latestReachLog,
    serverTime:
      typeof wrappedValue.serverTime === "string" ? wrappedValue.serverTime : fallback.serverTime,
  } satisfies BingoUnifiedState;
}

function socketUrl(path: string, parameters?: Record<string, string>) {
  const url = new URL(path, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  for (const [name, value] of Object.entries(parameters ?? {})) {
    url.searchParams.set(name, value);
  }
  return url.toString();
}

function jitter(delayMs: number) {
  const spread = delayMs * 0.15;
  return Math.round(delayMs - spread + Math.random() * spread * 2);
}

function isNewerState(current: BingoUnifiedState, next: BingoUnifiedState) {
  return current.generation !== next.generation || next.revision >= current.revision;
}

async function fetchState(
  signal: AbortSignal,
  fallback: BingoUnifiedState,
  etag: string | null,
  view: "public" | "screen",
) {
  const headers = new Headers({ Accept: "application/json" });
  if (etag !== null) headers.set("If-None-Match", etag);
  if (view === "screen") headers.set("X-Requested-With", "XMLHttpRequest");
  const response = await fetch(view === "screen" ? SCREEN_STATE_URL : PUBLIC_STATE_URL, {
    cache: "no-cache",
    credentials: "same-origin",
    headers,
    signal,
  });
  if (response.status === 304) {
    return { state: null, etag: response.headers.get("ETag") ?? etag };
  }
  if (view === "screen" && response.status === 401) {
    throw new ScreenAccessExpiredError("会場画面の再認証が必要です。");
  }
  if (!response.ok) {
    throw new Error(`ビンゴ状態の取得に失敗しました (${response.status})`);
  }

  return {
    state: normalizeBingoState(await response.json(), fallback),
    etag: response.headers.get("ETag"),
  };
}

function stateEtag(state: BingoUnifiedState) {
  return state.generation === "" ? null : `"${state.generation}:${state.revision}"`;
}

function useBingoState(initialState: BingoUnifiedState, view: "public" | "screen" = "public") {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let stableTimer: number | null = null;
    let screenAccessTimer: number | null = null;
    let fetchController: AbortController | null = null;
    let reconnectAttempt = 0;
    let fallbackAttempt = 0;
    let socketStateSequence = 0;
    let accessRefreshRequested = false;
    let etag = stateEtag(stateRef.current);

    const clearTimer = (timer: number | null) => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };

    const applyState = (nextState: BingoUnifiedState) => {
      if (!active || !isNewerState(stateRef.current, nextState)) {
        return;
      }
      stateRef.current = nextState;
      etag = stateEtag(nextState);
      setState(nextState);
    };

    const requestSnapshot = async () => {
      fetchController?.abort();
      const controller = new AbortController();
      fetchController = controller;
      const sequenceAtStart = socketStateSequence;
      const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const snapshot = await fetchState(controller.signal, stateRef.current, etag, view);
        if (sequenceAtStart === socketStateSequence) {
          etag = snapshot.etag ?? etag;
          if (snapshot.state !== null) {
            applyState(snapshot.state);
          }
        }
      } catch (error) {
        if (error instanceof ScreenAccessExpiredError) {
          if (!accessRefreshRequested) {
            accessRefreshRequested = true;
            window.location.assign("/screen");
          }
          return;
        }
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const scheduleFallback = () => {
      if (fallbackTimer !== null) return;
      if (!active || socket?.readyState === WebSocket.OPEN) {
        fallbackTimer = null;
        return;
      }
      const isLongTailScreenRecovery =
        view === "screen" && fallbackAttempt >= MAX_FALLBACK_ATTEMPTS;
      if (fallbackAttempt >= MAX_FALLBACK_ATTEMPTS && !isLongTailScreenRecovery) {
        fallbackTimer = null;
        return;
      }
      const baseInterval =
        document.visibilityState === "hidden" ? FALLBACK_HIDDEN_MS : FALLBACK_VISIBLE_MS;
      const interval = isLongTailScreenRecovery
        ? SCREEN_RECOVERY_MS
        : Math.min(baseInterval * 2 ** fallbackAttempt, MAX_FALLBACK_MS);
      if (!isLongTailScreenRecovery) {
        fallbackAttempt += 1;
      }
      fallbackTimer = window.setTimeout(async () => {
        fallbackTimer = null;
        await requestSnapshot();
        scheduleFallback();
      }, jitter(interval));
    };

    const connect = () => {
      clearTimer(reconnectTimer);
      if (
        !active ||
        socket?.readyState === WebSocket.CONNECTING ||
        socket?.readyState === WebSocket.OPEN ||
        navigator.onLine === false ||
        (view === "public" && reconnectAttempt >= MAX_RECONNECT_ATTEMPTS)
      ) {
        scheduleFallback();
        return;
      }

      const candidate = new WebSocket(
        socketUrl(view === "screen" ? SCREEN_STATE_SOCKET_PATH : PUBLIC_STATE_SOCKET_PATH),
      );
      socket = candidate;
      candidate.addEventListener("open", () => {
        if (socket !== candidate) return;
        clearTimer(fallbackTimer);
        fallbackTimer = null;
        clearTimer(stableTimer);
        stableTimer = window.setTimeout(() => {
          if (socket === candidate && candidate.readyState === WebSocket.OPEN) {
            reconnectAttempt = 0;
            fallbackAttempt = 0;
          }
        }, STABLE_CONNECTION_MS);
        clearTimer(screenAccessTimer);
        if (view === "screen") {
          screenAccessTimer = window.setTimeout(
            () => candidate.close(1000, "refresh access session"),
            SCREEN_ACCESS_RECHECK_MS,
          );
        }
      });
      candidate.addEventListener("message", (event) => {
        if (socket !== candidate) return;
        try {
          const message = JSON.parse(String(event.data)) as StateSocketMessage;
          if (message.type === "state") {
            socketStateSequence += 1;
            applyState(normalizeBingoState(message.state, stateRef.current));
            return;
          }
          if (
            message.type === "reach" &&
            message.generation === stateRef.current.generation &&
            Number.isSafeInteger(message.revision) &&
            message.revision >= stateRef.current.revision &&
            Number.isSafeInteger(message.reachCount) &&
            message.reachCount >= 0 &&
            isRecord(message.latestReachLog) &&
            typeof message.serverTime === "string"
          ) {
            socketStateSequence += 1;
            applyState({
              ...stateRef.current,
              revision: message.revision,
              appState: {
                ...stateRef.current.appState,
                reach_count: message.reachCount,
                updated_at: message.serverTime,
              },
              latestReachLog: message.latestReachLog,
              serverTime: message.serverTime,
            });
            return;
          }
          if (message.type === "generation") {
            socketStateSequence += 1;
            candidate.close(1000, "game generation changed");
          }
        } catch (error) {
          console.error("WebSocketメッセージの解析に失敗しました。", error);
        }
      });
      candidate.addEventListener("close", () => {
        if (socket !== candidate) return;
        clearTimer(stableTimer);
        stableTimer = null;
        clearTimer(screenAccessTimer);
        screenAccessTimer = null;
        socket = null;
        if (!active) {
          return;
        }
        scheduleFallback();
        const isLongTailScreenRecovery =
          view === "screen" && reconnectAttempt >= MAX_RECONNECT_ATTEMPTS;
        const delay = isLongTailScreenRecovery
          ? SCREEN_RECOVERY_MS
          : Math.min(1_000 * 2 ** reconnectAttempt, MAX_RECONNECT_MS);
        if (!isLongTailScreenRecovery) {
          reconnectAttempt += 1;
        }
        reconnectTimer = window.setTimeout(connect, jitter(delay));
      });
      candidate.addEventListener("error", () => candidate.close());
    };

    const restartRecovery = async () => {
      reconnectAttempt = 0;
      fallbackAttempt = 0;
      await requestSnapshot();
      connect();
    };
    const handleOnline = () => void restartRecovery();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socket?.readyState !== WebSocket.OPEN) {
        void restartRecovery();
      }
    };

    void requestSnapshot().finally(connect);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearTimer(reconnectTimer);
      clearTimer(fallbackTimer);
      clearTimer(stableTimer);
      clearTimer(screenAccessTimer);
      fetchController?.abort();
      socket?.close(1000, "page closed");
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view]);

  return state;
}

export function useHomeRealtimeState(initialNumbers: NumberRow[], initialAppState: AppStateRow) {
  const state = useBingoState(
    createEmptyState({ numbers: initialNumbers, appState: initialAppState }),
  );
  return {
    numbers: state.numbers,
    appState: state.appState,
    isReady: state.generation !== "",
  };
}

export function usePrizesRealtimeState(
  initialPrizes: PrizeWithImageUrl[],
  initialAppState: AppStateRow,
) {
  const state = useBingoState(
    createEmptyState({ prizes: initialPrizes, appState: initialAppState }),
  );
  return {
    prizes: state.prizes,
    appState: state.appState,
    isReady: state.generation !== "",
  };
}

export function useScreenRealtimeState(
  initialNumbers: NumberRow[],
  initialReachLog: ReachLogRow | null,
) {
  const state = useBingoState(
    createEmptyState({ numbers: initialNumbers, latestReachLog: initialReachLog }),
    "screen",
  );
  return {
    numbers: state.numbers,
    latestReachLog: state.latestReachLog,
    isReady: state.generation !== "",
  };
}

function isStampName(value: unknown): value is StampName {
  return typeof value === "string" && (STAMP_NAMES as readonly string[]).includes(value);
}

export function useStampStream(onInsert: (stamp: StampEvent) => void) {
  const onInsertRef = useRef(onInsert);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(String(event.data)) as StampSocketMessage;
      if (message.type === "stamp" && isRecord(message.stamp) && isStampName(message.stamp.name)) {
        onInsertRef.current(message.stamp);
      }
    } catch (error) {
      console.error("スタンプメッセージの解析に失敗しました。", error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stableTimer: number | null = null;
    let screenAccessTimer: number | null = null;
    let reconnectAttempt = 0;

    const connect = () => {
      if (
        !active ||
        socket?.readyState === WebSocket.CONNECTING ||
        socket?.readyState === WebSocket.OPEN ||
        navigator.onLine === false
      ) {
        return;
      }
      const candidate = new WebSocket(socketUrl(SCREEN_STAMP_SOCKET_PATH));
      socket = candidate;
      candidate.addEventListener("open", () => {
        if (socket !== candidate) return;
        if (stableTimer !== null) window.clearTimeout(stableTimer);
        stableTimer = window.setTimeout(() => {
          if (socket === candidate && candidate.readyState === WebSocket.OPEN) {
            reconnectAttempt = 0;
          }
        }, STABLE_CONNECTION_MS);
        if (screenAccessTimer !== null) window.clearTimeout(screenAccessTimer);
        screenAccessTimer = window.setTimeout(
          () => candidate.close(1000, "refresh access session"),
          SCREEN_ACCESS_RECHECK_MS,
        );
      });
      candidate.addEventListener("message", handleMessage);
      candidate.addEventListener("close", () => {
        if (socket !== candidate) return;
        if (stableTimer !== null) {
          window.clearTimeout(stableTimer);
          stableTimer = null;
        }
        if (screenAccessTimer !== null) {
          window.clearTimeout(screenAccessTimer);
          screenAccessTimer = null;
        }
        socket = null;
        if (!active) {
          return;
        }
        const isLongTailRecovery = reconnectAttempt >= MAX_RECONNECT_ATTEMPTS;
        const delay = isLongTailRecovery
          ? SCREEN_RECOVERY_MS
          : Math.min(1_000 * 2 ** reconnectAttempt, MAX_RECONNECT_MS);
        if (!isLongTailRecovery) {
          reconnectAttempt += 1;
        }
        reconnectTimer = window.setTimeout(connect, jitter(delay));
      });
      candidate.addEventListener("error", () => candidate.close());
    };

    const restartRecovery = () => {
      reconnectAttempt = 0;
      connect();
    };
    const handleOnline = () => restartRecovery();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socket?.readyState !== WebSocket.OPEN) {
        restartRecovery();
      }
    };

    connect();
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (stableTimer !== null) {
        window.clearTimeout(stableTimer);
      }
      if (screenAccessTimer !== null) {
        window.clearTimeout(screenAccessTimer);
      }
      socket?.close(1000, "page closed");
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleMessage]);
}
