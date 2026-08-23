"use client";

import Script from "next/script";

import { updateTurnstileScriptStatus } from "./turnstile-script-status";

const TURNSTILE_API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function TurnstileScript() {
  return (
    <Script
      id="cloudflare-turnstile-api"
      src={TURNSTILE_API_URL}
      strategy="afterInteractive"
      onReady={() => updateTurnstileScriptStatus("ready")}
      onError={() => updateTurnstileScriptStatus("error")}
    />
  );
}
