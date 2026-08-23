"use client";

import { type Ref, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { subscribeToTurnstileScript } from "./turnstile-script-status";
import styles from "./Turnstile.module.css";

const TURNSTILE_ACTION = "turnstile-spin-v1";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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
    return subscribeToTurnstileScript((status) => {
      if (status === "ready") renderWidget();
      if (status === "error") clearTokenWithError();
    });
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
