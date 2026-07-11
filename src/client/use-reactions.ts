import { useCallback, useEffect, useRef, useState } from "react";

import type { ReactionName } from "../shared/protocol";
import { reactionBatchSchema } from "../shared/schemas";
import { ensureSession } from "./api";

export function useReactionSender(): {
  sendReaction: (name: ReactionName) => boolean;
  connected: boolean;
  error: string | null;
} {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let retryTimer: number | null = null;
    let attempt = 0;
    const connect = async () => {
      try {
        await ensureSession();
        if (stopped) return;
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(`${protocol}//${location.host}/api/reactions/ws?role=client`);
        socketRef.current = socket;
        socket.addEventListener("open", () => {
          attempt = 0;
          setConnected(true);
          setError(null);
        });
        socket.addEventListener("message", (message) => {
          const data: unknown = JSON.parse(String(message.data));
          if (
            data &&
            typeof data === "object" &&
            "type" in data &&
            data.type === "error" &&
            "message" in data &&
            typeof data.message === "string"
          ) {
            setError(data.message);
          }
        });
        socket.addEventListener("close", () => {
          setConnected(false);
          if (stopped) return;
          const delay = Math.min(30_000, 1000 * 2 ** attempt);
          attempt += 1;
          retryTimer = window.setTimeout(
            () => void connect(),
            delay * (0.75 + Math.random() * 0.5),
          );
        });
        socket.addEventListener("error", () => socket.close());
      } catch (connectionError) {
        setError(
          connectionError instanceof Error ? connectionError.message : "Reaction connection failed",
        );
      }
    };
    void connect();
    return () => {
      stopped = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socketRef.current?.close(1000, "Component unmounted");
    };
  }, []);

  const sendReaction = useCallback((name: ReactionName) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify({ type: "reaction", name }));
    return true;
  }, []);

  return { sendReaction, connected, error };
}

export function useReactionScreens(onReaction: (name: ReactionName) => void): boolean {
  const callbackRef = useRef(onReaction);
  callbackRef.current = onReaction;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;
    const sockets: WebSocket[] = [];
    const retryTimers: number[] = [];
    let openCount = 0;

    const connectShard = (shard: number, count: number, attempt: number) => {
      if (stopped) return;
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(
        `${protocol}//${location.host}/api/reactions/ws?role=screen&shard=${shard}`,
      );
      sockets.push(socket);
      socket.addEventListener("open", () => {
        openCount += 1;
        setConnected(openCount === count);
      });
      socket.addEventListener("message", (message) => {
        const parsed = reactionBatchSchema.safeParse(JSON.parse(String(message.data)));
        if (parsed.success)
          parsed.data.reactions.forEach((reaction) => callbackRef.current(reaction.name));
      });
      socket.addEventListener("close", () => {
        openCount = Math.max(0, openCount - 1);
        setConnected(false);
        if (!stopped) {
          const delay = Math.min(30_000, 1000 * 2 ** attempt);
          retryTimers.push(window.setTimeout(() => connectShard(shard, count, attempt + 1), delay));
        }
      });
      socket.addEventListener("error", () => socket.close());
    };

    void ensureSession().then(({ reactionShards }) => {
      for (let shard = 0; shard < reactionShards; shard += 1)
        connectShard(shard, reactionShards, 0);
    });
    return () => {
      stopped = true;
      retryTimers.forEach(window.clearTimeout);
      sockets.forEach((socket) => socket.close(1000, "Component unmounted"));
    };
  }, []);

  return connected;
}
