"use client";

import { useEffect, useRef, useState } from "react";

import type {
  BingoUnifiedState,
  StampEvent,
  StampSocketMessage,
  StateSocketMessage,
} from "@/types/bingo/realtime";
import { makeStateEtag, weaklyMatchesEntityTag } from "../../shared/state-etag";
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
import { startVenueSocketLifecycle } from "@/lib/venue-socket-lifecycle";
import { shouldAcceptRevision, type StateUpdateAuthority } from "@/lib/state-order";

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
const SOCKET_READY_TIMEOUT_MS = 10_000;
const SCREEN_RECOVERY_MS = 5 * 60_000;
const SCREEN_STATE_VERIFY_MS = 5 * 60_000;
const SCREEN_SOCKET_REPLACEMENT_MS = 5 * 60_000;
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
    event_id: typeof value.event_id === "string" ? value.event_id : fallback.event_id,
    survey_url: typeof value.survey_url === "string" ? value.survey_url : fallback.survey_url,
    survey_title:
      typeof value.survey_title === "string" ? value.survey_title : fallback.survey_title,
    survey_description:
      typeof value.survey_description === "string"
        ? value.survey_description
        : fallback.survey_description,
    survey_button_label:
      typeof value.survey_button_label === "string"
        ? value.survey_button_label
        : fallback.survey_button_label,
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
  return state.appState.event_id === "" ? null : makeStateEtag(state.revision);
}

function useBingoState(initialState: BingoUnifiedState, view: "public" | "screen" = "public") {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let socketReady = false;
    let reconnectTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let stableTimer: number | null = null;
    let readyTimer: number | null = null;
    let screenAccessTimer: number | null = null;
    let screenVerifyTimer: number | null = null;
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

    const applyState = (nextState: BingoUnifiedState, authority: StateUpdateAuthority): boolean => {
      if (
        !active ||
        !shouldAcceptRevision(stateRef.current.revision, nextState.revision, authority)
      ) {
        return false;
      }
      stateRef.current = nextState;
      etag = stateEtag(nextState);
      setState(nextState);
      return true;
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
          if (snapshot.state === null) {
            etag = snapshot.etag ?? etag;
          } else {
            const expectedEtag = stateEtag(snapshot.state);
            if (expectedEtag === null || !weaklyMatchesEntityTag(snapshot.etag, expectedEtag)) {
              throw new Error("ビンゴ状態のETagが内容と一致しません。");
            }
            applyState(snapshot.state, "authoritative");
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

    const scheduleScreenVerification = () => {
      clearTimer(screenVerifyTimer);
      screenVerifyTimer = null;
      if (!active || view !== "screen" || !socketReady) return;
      screenVerifyTimer = window.setTimeout(async () => {
        screenVerifyTimer = null;
        await requestSnapshot();
        scheduleScreenVerification();
      }, SCREEN_STATE_VERIFY_MS);
    };

    const markSocketReady = (candidate: WebSocket) => {
      if (socket !== candidate || socketReady) return;
      socketReady = true;
      clearTimer(readyTimer);
      readyTimer = null;
      clearTimer(fallbackTimer);
      fallbackTimer = null;
      clearTimer(stableTimer);
      stableTimer = window.setTimeout(() => {
        if (socket === candidate && candidate.readyState === WebSocket.OPEN && socketReady) {
          reconnectAttempt = 0;
          fallbackAttempt = 0;
        }
      }, STABLE_CONNECTION_MS);
      scheduleScreenVerification();
    };

    const scheduleFallback = () => {
      if (fallbackTimer !== null) return;
      if (!active || (socket?.readyState === WebSocket.OPEN && socketReady)) {
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
      reconnectTimer = null;
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
      let hasAcceptedFullState = false;
      socket = candidate;
      socketReady = false;
      candidate.addEventListener("open", () => {
        if (socket !== candidate) return;
        clearTimer(readyTimer);
        readyTimer = window.setTimeout(() => {
          if (socket === candidate && !socketReady) {
            candidate.close(4001, "state socket ready timeout");
          }
        }, SOCKET_READY_TIMEOUT_MS);
        scheduleFallback();
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
            const nextState = normalizeBingoState(message.state, stateRef.current);
            if (nextState.appState.event_id === "") {
              throw new Error("state frame has no event ID");
            }
            const accepted = applyState(
              nextState,
              hasAcceptedFullState ? "incremental" : "authoritative",
            );
            if (accepted) {
              hasAcceptedFullState = true;
              socketStateSequence += 1;
              markSocketReady(candidate);
            }
            return;
          }
          if (
            message.type === "reach" &&
            hasAcceptedFullState &&
            Number.isSafeInteger(message.revision) &&
            Number.isSafeInteger(message.reachCount) &&
            message.reachCount >= 0 &&
            isRecord(message.latestReachLog) &&
            typeof message.serverTime === "string"
          ) {
            const accepted = applyState(
              {
                ...stateRef.current,
                revision: message.revision,
                appState: {
                  ...stateRef.current.appState,
                  reach_count: message.reachCount,
                  updated_at: message.serverTime,
                },
                latestReachLog: message.latestReachLog,
                serverTime: message.serverTime,
              },
              "incremental",
            );
            if (accepted) socketStateSequence += 1;
            return;
          }
        } catch (error) {
          console.error("WebSocketメッセージの解析に失敗しました。", error);
        }
      });
      candidate.addEventListener("close", () => {
        if (socket !== candidate) return;
        clearTimer(readyTimer);
        readyTimer = null;
        clearTimer(stableTimer);
        stableTimer = null;
        clearTimer(screenAccessTimer);
        screenAccessTimer = null;
        clearTimer(screenVerifyTimer);
        screenVerifyTimer = null;
        socket = null;
        socketReady = false;
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
      if (socket?.readyState === WebSocket.OPEN && !socketReady) {
        socket.close(4001, "state socket recovery");
        return;
      }
      connect();
    };
    const handleOnline = () => void restartRecovery();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (view === "screen") void requestSnapshot();
      if (socket?.readyState !== WebSocket.OPEN || !socketReady) {
        void restartRecovery();
      }
    };

    void requestSnapshot();
    connect();
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearTimer(reconnectTimer);
      clearTimer(fallbackTimer);
      clearTimer(stableTimer);
      clearTimer(readyTimer);
      clearTimer(screenAccessTimer);
      clearTimer(screenVerifyTimer);
      fetchController?.abort();
      socket?.close(1000, "page closed");
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view]);

  return state;
}

export function useHomeRealtimeState() {
  const state = useBingoState(createEmptyState());
  return {
    numbers: state.numbers,
    appState: state.appState,
    isReady: state.appState.event_id !== "",
  };
}

export function usePrizesRealtimeState() {
  const state = useBingoState(createEmptyState());
  return {
    prizes: state.prizes,
    appState: state.appState,
    isReady: state.appState.event_id !== "",
  };
}

export function useScreenRealtimeState() {
  const state = useBingoState(createEmptyState(), "screen");
  return {
    numbers: state.numbers,
    latestReachLog: state.latestReachLog,
    isReady: state.appState.event_id !== "",
  };
}

function isStampName(value: unknown): value is StampName {
  return typeof value === "string" && (STAMP_NAMES as readonly string[]).includes(value);
}

function parseStampSocketMessage(event: MessageEvent): StampSocketMessage | null {
  try {
    const message = JSON.parse(String(event.data)) as StampSocketMessage;
    if (message.type === "ready") return message;
    if (message.type === "stamp" && isRecord(message.stamp) && isStampName(message.stamp.name)) {
      return message;
    }
  } catch (error) {
    console.error("スタンプメッセージの解析に失敗しました。", error);
  }
  return null;
}

export function useStampStream(onInsert: (stamp: StampEvent) => void) {
  const onInsertRef = useRef(onInsert);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(
    () =>
      startVenueSocketLifecycle({
        url: socketUrl(SCREEN_STAMP_SOCKET_PATH),
        replacementIntervalMs: SCREEN_SOCKET_REPLACEMENT_MS,
        replaceHealthySocketOnWake: true,
        onMessage: (event, _candidate, isActiveSocket) => {
          const message = parseStampSocketMessage(event);
          if (message === null) return "ignored";
          if (message.type === "ready") return "ready";
          if (isActiveSocket) onInsertRef.current(message.stamp);
          return "handled";
        },
      }),
    [],
  );
}
