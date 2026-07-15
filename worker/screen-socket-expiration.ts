const SCREEN_SOCKET_MAX_AGE_MS = 30 * 60 * 1_000;

type SocketAttachment = {
  connected_at?: unknown;
};

export async function scheduleScreenSocketExpiration(
  ctx: DurableObjectState,
  tag: string,
): Promise<void> {
  const nextExpiration = findNextExpiration(ctx.getWebSockets(tag));
  if (nextExpiration === null) return;

  const existingAlarm = await ctx.storage.getAlarm();
  if (existingAlarm === null || nextExpiration < existingAlarm) {
    await ctx.storage.setAlarm(nextExpiration);
  }
}

export async function expireScreenSockets(ctx: DurableObjectState, tag: string): Promise<void> {
  const now = Date.now();
  let nextExpiration: number | null = null;

  for (const socket of ctx.getWebSockets(tag)) {
    const expiration = readExpiration(socket);
    if (expiration === null || expiration <= now) {
      safeClose(socket, 1012, "screen authorization refresh");
      continue;
    }
    nextExpiration = nextExpiration === null ? expiration : Math.min(nextExpiration, expiration);
  }

  if (nextExpiration === null) {
    await ctx.storage.deleteAlarm();
  } else {
    await ctx.storage.setAlarm(nextExpiration);
  }
}

function findNextExpiration(sockets: WebSocket[]): number | null {
  let nextExpiration: number | null = null;
  for (const socket of sockets) {
    const expiration = readExpiration(socket);
    if (expiration === null) return Date.now();
    nextExpiration = nextExpiration === null ? expiration : Math.min(nextExpiration, expiration);
  }
  return nextExpiration;
}

function readExpiration(socket: WebSocket): number | null {
  try {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    if (attachment === null || typeof attachment.connected_at !== "string") return null;
    const connectedAt = Date.parse(attachment.connected_at);
    if (!Number.isFinite(connectedAt)) return null;
    return connectedAt + SCREEN_SOCKET_MAX_AGE_MS;
  } catch {
    return null;
  }
}

function safeClose(socket: WebSocket, code: number, reason: string): void {
  try {
    socket.close(code, reason);
  } catch {
    // The peer may already be closing; the next scan will no longer include it.
  }
}
