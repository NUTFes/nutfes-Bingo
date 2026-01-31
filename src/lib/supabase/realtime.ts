export const logRealtimeChannelError = (label: string, err?: unknown) => {
  if (err instanceof Error) {
    console.error(`[Realtime] ${label} channel error: ${err.message}`, err);
    return;
  }

  if (typeof err === "string" && err.trim().length > 0) {
    console.error(`[Realtime] ${label} channel error: ${err}`);
    return;
  }

  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      console.error(`[Realtime] ${label} channel error: ${message}`, err);
      return;
    }
  }

  console.warn(`[Realtime] ${label} channel error: details unavailable`);
};
