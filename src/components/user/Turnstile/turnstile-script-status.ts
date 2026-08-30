type TurnstileScriptStatus = "loading" | "ready" | "error";
type TurnstileScriptListener = (status: TurnstileScriptStatus) => void;

let scriptStatus: TurnstileScriptStatus = "loading";
const listeners = new Set<TurnstileScriptListener>();

export function updateTurnstileScriptStatus(status: TurnstileScriptStatus) {
  if (scriptStatus === status) return;

  scriptStatus = status;
  for (const listener of listeners) listener(status);
}

export function subscribeToTurnstileScript(listener: TurnstileScriptListener) {
  if (window.turnstile !== undefined) {
    scriptStatus = "ready";
  }

  listeners.add(listener);
  listener(scriptStatus);
  return () => {
    listeners.delete(listener);
  };
}
