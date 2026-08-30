import { useEffect } from "react";

import { updateTurnstileScriptStatus } from "./turnstile-script-status";

const TURNSTILE_API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-api";

export default function TurnstileScript() {
  useEffect(() => {
    if (window.turnstile) {
      updateTurnstileScriptStatus("ready");
      return;
    }

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const handleLoad = () => updateTurnstileScriptStatus("ready");
    const handleError = () => updateTurnstileScriptStatus("error");

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existing) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_API_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
