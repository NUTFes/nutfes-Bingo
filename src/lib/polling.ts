"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  BingoStateResponse,
  PrizeStateResponse,
  ScreenStateResponse,
  StampEventsResponse,
} from "@/types/bingo/polling";
import type {
  AppStateRow,
  NumberRow,
  PrizeWithImageUrl,
  ReachLogRow,
  StampName,
} from "@/types/bingo/types";

type PollingOptions<T> = {
  url: string;
  initialData: T;
  intervalMs: number;
  hiddenIntervalMs?: number;
  maxBackoffMs?: number;
};

type PollingLoopOptions = {
  intervalMs: number;
  hiddenIntervalMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
  refetchOnVisible?: boolean;
  onPoll: (signal: AbortSignal) => Promise<void>;
};

function withJitter(intervalMs: number) {
  const jitter = intervalMs * 0.15;
  return Math.max(250, Math.round(intervalMs - jitter + Math.random() * jitter * 2));
}

function nextDelay(baseIntervalMs: number, hiddenIntervalMs: number | undefined, failures: number) {
  const visibleInterval =
    typeof document !== "undefined" && document.visibilityState === "hidden" && hiddenIntervalMs
      ? hiddenIntervalMs
      : baseIntervalMs;

  if (failures === 0) {
    return visibleInterval;
  }

  return Math.min(30000, visibleInterval * 2 ** Math.min(failures, 5));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function usePollingLoop({
  intervalMs,
  hiddenIntervalMs,
  maxBackoffMs = 30000,
  timeoutMs = 5000,
  refetchOnVisible = true,
  onPoll,
}: PollingLoopOptions) {
  const timeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const failuresRef = useRef(0);

  useEffect(() => {
    let isActive = true;

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const schedule = (delayMs: number) => {
      clearTimer();
      timeoutRef.current = window.setTimeout(fetchOnce, withJitter(delayMs));
    };

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      let didTimeout = false;
      const fetchTimeout = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);

      try {
        await onPoll(controller.signal);
        failuresRef.current = 0;
      } catch (error) {
        if (!isAbortError(error) || didTimeout) {
          failuresRef.current += 1;
          console.error(error);
        }
      } finally {
        window.clearTimeout(fetchTimeout);
        if (isActive && (!controller.signal.aborted || didTimeout)) {
          schedule(
            Math.min(nextDelay(intervalMs, hiddenIntervalMs, failuresRef.current), maxBackoffMs),
          );
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearTimer();
        void fetchOnce();
      }
    };

    void fetchOnce();
    if (refetchOnVisible) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isActive = false;
      clearTimer();
      const currentAbort = abortRef.current;
      currentAbort?.abort();
      if (refetchOnVisible) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [hiddenIntervalMs, intervalMs, maxBackoffMs, onPoll, refetchOnVisible, timeoutMs]);
}

async function fetchPollingJson<T>(
  url: string,
  etagRef: { current: string | null },
  signal: AbortSignal,
) {
  const headers = new Headers();
  if (etagRef.current) {
    headers.set("If-None-Match", etagRef.current);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers,
    signal,
  });

  if (response.status === 304) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Polling failed: ${response.status}`);
  }

  const nextData = (await response.json()) as T;
  etagRef.current = response.headers.get("etag");

  return nextData;
}

function usePollingJson<T>({
  url,
  initialData,
  intervalMs,
  hiddenIntervalMs,
  maxBackoffMs = 30000,
}: PollingOptions<T>): [T, Dispatch<SetStateAction<T>>] {
  const [data, setData] = useState<T>(initialData);
  const etagRef = useRef<string | null>(null);

  const poll = useCallback(
    async (signal: AbortSignal) => {
      const nextData = await fetchPollingJson<T>(url, etagRef, signal);
      if (nextData === null) {
        return;
      }

      setData(nextData);
    },
    [url],
  );

  usePollingLoop({
    intervalMs,
    hiddenIntervalMs,
    maxBackoffMs,
    onPoll: poll,
  });

  return [data, setData];
}

export function useHomePollingState(initialNumbers: NumberRow[], initialAppState: AppStateRow) {
  const [state, setState] = usePollingJson<BingoStateResponse>({
    url: "/api/bingo/state",
    intervalMs: 2000,
    hiddenIntervalMs: 15000,
    initialData: {
      numbers: initialNumbers,
      appState: initialAppState,
      serverTime: new Date().toISOString(),
    },
  });

  const setNumbers = useCallback<Dispatch<SetStateAction<NumberRow[]>>>(
    (nextNumbers) => {
      setState((prev) => ({
        ...prev,
        numbers: typeof nextNumbers === "function" ? nextNumbers(prev.numbers) : nextNumbers,
      }));
    },
    [setState],
  );

  return {
    numbers: state.numbers,
    appState: state.appState,
    setNumbers,
  };
}

export function usePrizesPollingState(
  initialPrizes: PrizeWithImageUrl[],
  initialAppState: AppStateRow,
) {
  const [state, setState] = usePollingJson<PrizeStateResponse>({
    url: "/api/bingo/prizes",
    intervalMs: 5000,
    hiddenIntervalMs: 15000,
    initialData: {
      prizes: initialPrizes,
      appState: initialAppState,
      serverTime: new Date().toISOString(),
    },
  });

  const setPrizes = useCallback<Dispatch<SetStateAction<PrizeWithImageUrl[]>>>(
    (nextPrizes) => {
      setState((prev) => ({
        ...prev,
        prizes: typeof nextPrizes === "function" ? nextPrizes(prev.prizes) : nextPrizes,
      }));
    },
    [setState],
  );

  return {
    prizes: state.prizes,
    appState: state.appState,
    setPrizes,
  };
}

export function useScreenPollingState(
  initialNumbers: NumberRow[],
  initialReachLog: ReachLogRow | null,
) {
  const [state] = usePollingJson<ScreenStateResponse>({
    url: "/api/bingo/screen",
    intervalMs: 1200,
    hiddenIntervalMs: 3000,
    initialData: {
      numbers: initialNumbers,
      latestReachLog: initialReachLog,
      serverTime: new Date().toISOString(),
    },
  });

  return {
    numbers: state.numbers,
    latestReachLog: state.latestReachLog,
  };
}

export function useNumbersPolling(initialNumbers: NumberRow[]) {
  const [state, setState] = usePollingJson<BingoStateResponse>({
    url: "/api/bingo/state",
    intervalMs: 2000,
    hiddenIntervalMs: 15000,
    initialData: {
      numbers: initialNumbers,
      appState: {
        id: 1,
        survey_url: "",
        is_survey_active: false,
        reach_count: 0,
        updated_at: "",
      },
      serverTime: new Date().toISOString(),
    },
  });

  const setNumbers = useCallback<Dispatch<SetStateAction<NumberRow[]>>>(
    (nextNumbers) => {
      setState((prev) => ({
        ...prev,
        numbers: typeof nextNumbers === "function" ? nextNumbers(prev.numbers) : nextNumbers,
      }));
    },
    [setState],
  );

  return [state.numbers, setNumbers] as const;
}

export function usePrizesPolling(initialPrizes: PrizeWithImageUrl[]) {
  const [state, setState] = usePollingJson<PrizeStateResponse>({
    url: "/api/bingo/prizes",
    intervalMs: 5000,
    hiddenIntervalMs: 15000,
    initialData: {
      prizes: initialPrizes,
      appState: {
        id: 1,
        survey_url: "",
        is_survey_active: false,
        reach_count: 0,
        updated_at: "",
      },
      serverTime: new Date().toISOString(),
    },
  });

  const setPrizes = useCallback<Dispatch<SetStateAction<PrizeWithImageUrl[]>>>(
    (nextPrizes) => {
      setState((prev) => ({
        ...prev,
        prizes: typeof nextPrizes === "function" ? nextPrizes(prev.prizes) : nextPrizes,
      }));
    },
    [setState],
  );

  return [state.prizes, setPrizes] as const;
}

export function useStampTriggerPolling(
  initialCursor: number,
  onInsert: (stamp: { id: number; name: StampName }) => void,
) {
  const cursorRef = useRef(initialCursor);
  const onInsertRef = useRef(onInsert);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    cursorRef.current = initialCursor;
  }, [initialCursor]);

  const poll = useCallback(async (signal: AbortSignal) => {
    const response = await fetch(`/api/bingo/stamps?after=${cursorRef.current}`, {
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Stamp polling failed: ${response.status}`);
    }

    const data = (await response.json()) as StampEventsResponse;
    data.stamps.forEach((stamp) => {
      onInsertRef.current({
        id: stamp.id,
        name: stamp.name as StampName,
      });
    });
    cursorRef.current = data.nextCursor;
  }, []);

  usePollingLoop({
    intervalMs: 500,
    hiddenIntervalMs: 1500,
    maxBackoffMs: 30000,
    refetchOnVisible: false,
    onPoll: poll,
  });
}
