"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        textAlign: "center",
        backgroundColor: "#121212",
        color: "#e0e0e0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p
        style={{
          marginBottom: "1rem",
          fontSize: "0.875rem",
          color: "#a0a0a0",
        }}
      >
        エラーが発生しました。
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          borderRadius: "0.25rem",
          backgroundColor: "#2563eb",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
        }}
      >
        再試行
      </button>
    </div>
  );
}
