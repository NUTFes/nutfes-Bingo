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
    <div className="p-6 text-center">
      <p className="mb-4 text-sm text-muted-foreground">管理画面でエラーが発生しました。</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        再試行
      </button>
    </div>
  );
}
