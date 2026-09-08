import { useEffect } from "react";

import { updateTurnstileScriptStatus } from "./turnstile-script-status";

const TURNSTILE_API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cloudflare-turnstile-api";

export default function TurnstileScript() {
  useEffect(() => {
    if (window.turnstile) {
      updateTurnstileScriptStatus("ready");
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`#${SCRIPT_ID}`);
    if (script?.dataset.turnstileStatus === "ready") {
      updateTurnstileScriptStatus("ready");
      return;
    }
    if (script?.dataset.turnstileStatus === "error") {
      updateTurnstileScriptStatus("error");
      return;
    }

    const handleLoad = () => {
      script!.dataset.turnstileStatus = "ready";
      updateTurnstileScriptStatus("ready");
    };
    const handleError = () => {
      script!.dataset.turnstileStatus = "error";
      updateTurnstileScriptStatus("error");
    };

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = TURNSTILE_API_URL;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileStatus = "loading";
      document.head.appendChild(script);
    }
    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    return () => {
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
