type VenueSocketMessageDisposition = "ready" | "handled" | "ignored";

type VenueSocketLifecycleOptions = {
  url: string;
  replacementIntervalMs: number;
  replaceHealthySocketOnWake: boolean;
  onMessage: (
    event: MessageEvent,
    socket: WebSocket,
    isActiveSocket: boolean,
  ) => VenueSocketMessageDisposition;
  onWake?: () => void;
};

const SOCKET_READY_TIMEOUT_MS = 10_000;
const STABLE_CONNECTION_MS = 60_000;
const MAX_RECONNECT_MS = 30_000;
const LONG_TAIL_RECOVERY_MS = 5 * 60_000;
const MAX_RECONNECT_ATTEMPTS = 8;

export function startVenueSocketLifecycle(options: VenueSocketLifecycleOptions): () => void {
  let running = true;
  let socket: WebSocket | null = null;
  let connectingSocket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let replacementTimer: number | null = null;
  let stableTimer: number | null = null;
  let readyTimer: number | null = null;
  let reconnectAttempt = 0;

  const clearTimer = (timer: number | null) => {
    if (timer !== null) window.clearTimeout(timer);
  };

  const reconnectDelay = () => {
    const longTail = reconnectAttempt >= MAX_RECONNECT_ATTEMPTS;
    const delay = longTail
      ? LONG_TAIL_RECOVERY_MS
      : Math.min(1_000 * 2 ** reconnectAttempt, MAX_RECONNECT_MS);
    if (!longTail) reconnectAttempt += 1;
    return jitter(delay);
  };

  const scheduleReplacement = (delay = options.replacementIntervalMs) => {
    clearTimer(replacementTimer);
    replacementTimer = null;
    if (!running || socket?.readyState !== WebSocket.OPEN) return;
    replacementTimer = window.setTimeout(() => {
      replacementTimer = null;
      connect(true);
    }, jitter(delay));
  };

  const scheduleReconnect = () => {
    if (
      !running ||
      reconnectTimer !== null ||
      connectingSocket !== null ||
      socket?.readyState === WebSocket.OPEN
    ) {
      return;
    }
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect(false);
    }, reconnectDelay());
  };

  const promote = (candidate: WebSocket) => {
    if (connectingSocket !== candidate) return;
    clearTimer(readyTimer);
    readyTimer = null;
    const previous = socket;
    socket = candidate;
    connectingSocket = null;

    clearTimer(stableTimer);
    stableTimer = window.setTimeout(() => {
      if (socket === candidate && candidate.readyState === WebSocket.OPEN) reconnectAttempt = 0;
    }, STABLE_CONNECTION_MS);
    scheduleReplacement();

    if (previous !== null && previous !== candidate) {
      previous.close(1000, "venue socket replaced");
    }
  };

  const connect = (replaceHealthySocket: boolean) => {
    clearTimer(reconnectTimer);
    reconnectTimer = null;
    if (
      !running ||
      navigator.onLine === false ||
      connectingSocket !== null ||
      (!replaceHealthySocket && socket?.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    clearTimer(replacementTimer);
    replacementTimer = null;
    const candidate = new WebSocket(options.url);
    connectingSocket = candidate;

    candidate.addEventListener("open", () => {
      if (connectingSocket !== candidate) return;
      clearTimer(readyTimer);
      readyTimer = window.setTimeout(() => {
        if (connectingSocket === candidate) {
          candidate.close(4001, "venue socket ready timeout");
        }
      }, SOCKET_READY_TIMEOUT_MS);
    });
    candidate.addEventListener("message", (event) => {
      const disposition = options.onMessage(event, candidate, socket === candidate);
      if (disposition === "ready") promote(candidate);
    });
    candidate.addEventListener("close", () => {
      const wasConnecting = connectingSocket === candidate;
      const wasActive = socket === candidate;
      if (!wasConnecting && !wasActive) return;

      if (wasConnecting) {
        connectingSocket = null;
        clearTimer(readyTimer);
        readyTimer = null;
      }
      if (wasActive) {
        socket = null;
        clearTimer(stableTimer);
        stableTimer = null;
        clearTimer(replacementTimer);
        replacementTimer = null;
      }
      if (!running) return;

      if (socket?.readyState === WebSocket.OPEN) {
        scheduleReplacement(reconnectDelay());
      } else {
        scheduleReconnect();
      }
    });
    candidate.addEventListener("error", () => candidate.close());
  };

  const restartRecovery = () => {
    reconnectAttempt = 0;
    options.onWake?.();
    if (socket?.readyState === WebSocket.OPEN) {
      if (options.replaceHealthySocketOnWake) connect(true);
    } else {
      connect(false);
    }
  };
  const handleOnline = () => restartRecovery();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") restartRecovery();
  };

  connect(false);
  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    running = false;
    clearTimer(reconnectTimer);
    clearTimer(replacementTimer);
    clearTimer(stableTimer);
    clearTimer(readyTimer);
    connectingSocket?.close(1000, "page closed");
    if (socket !== connectingSocket) socket?.close(1000, "page closed");
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

function jitter(delayMs: number): number {
  const spread = delayMs * 0.15;
  return Math.round(delayMs - spread + Math.random() * spread * 2);
}
