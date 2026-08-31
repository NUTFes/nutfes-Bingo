import { type Ref, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import styles from "./Turnstile.module.css";

const TURNSTILE_ACTION = "turnstile-spin-v1";
const TURNSTILE_ALWAYS_PASS_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  (import.meta.env.DEV ? TURNSTILE_ALWAYS_PASS_TEST_SITE_KEY : "");
const TURNSTILE_API_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-api";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      language: "ja" | "en";
      size: "compact";
      theme: "auto";
      retry: "auto";
      "refresh-expired": "auto";
      "refresh-timeout": "auto";
      "response-field": false;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string | undefined;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  reset: () => void;
};

type TurnstileProps = {
  language: "ja" | "en";
  onError: () => void;
  onTokenChange: (token: string | null) => void;
  ref?: Ref<TurnstileHandle>;
};

export default function Turnstile({ language, onError, onTokenChange, ref }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ language, onError, onTokenChange });

  useEffect(() => {
    callbacksRef.current = { language, onError, onTokenChange };
  }, [language, onError, onTokenChange]);

  const clearTokenWithError = useCallback(() => {
    callbacksRef.current.onTokenChange(null);
    callbacksRef.current.onError();
  }, []);

  const renderWidget = useCallback(() => {
    if (widgetIdRef.current !== null) return;
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (container === null || turnstile === undefined || TURNSTILE_SITE_KEY === "") {
      clearTokenWithError();
      return;
    }

    const widgetId = turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      appearance: "interaction-only",
      language: callbacksRef.current.language,
      size: "compact",
      theme: "auto",
      retry: "auto",
      "refresh-expired": "auto",
      "refresh-timeout": "auto",
      "response-field": false,
      callback: (token) => callbacksRef.current.onTokenChange(token),
      "expired-callback": clearTokenWithError,
      "error-callback": clearTokenWithError,
      "timeout-callback": clearTokenWithError,
    });
    if (widgetId === undefined) {
      clearTokenWithError();
      return;
    }
    widgetIdRef.current = widgetId;
  }, [clearTokenWithError]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        callbacksRef.current.onTokenChange(null);
        const widgetId = widgetIdRef.current;
        if (widgetId !== null) window.turnstile?.reset(widgetId);
      },
    }),
    [],
  );

  useEffect(() => {
    const widgetId = widgetIdRef.current;
    if (widgetId !== null) {
      window.turnstile?.remove(widgetId);
      widgetIdRef.current = null;
      callbacksRef.current.onTokenChange(null);
    }
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const handleLoad = () => renderWidget();
    const handleError = () => clearTokenWithError();

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
      if (!window.turnstile) script.remove();
    };
  }, [clearTokenWithError, language, renderWidget]);

  useEffect(
    () => () => {
      const widgetId = widgetIdRef.current;
      if (widgetId !== null) window.turnstile?.remove(widgetId);
      widgetIdRef.current = null;
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className={styles.widget}
      data-action={TURNSTILE_ACTION}
      aria-hidden="false"
    />
  );
}
