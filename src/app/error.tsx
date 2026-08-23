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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#121212] text-center text-[#e0e0e0]">
      <p className="mb-4 text-sm text-[#a0a0a0]">エラーが発生しました。</p>
      <button
        type="button"
        onClick={() => reset()}
        className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm text-white border-none"
      >
        再試行
      </button>
    </div>
  );
}
