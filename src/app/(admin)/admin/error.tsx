"use client";

import { Button } from "@/components/ui/Button";
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
    <div className="flex h-screen items-center justify-center bg-linear-to-b from-zinc-900 via-zinc-950 to-black px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/90 p-6 text-center text-zinc-100 shadow-2xl sm:p-7">
        <p className="mb-2 text-base font-semibold sm:text-lg">管理画面でエラーが発生しました。</p>
        <p className="mb-5 text-sm text-zinc-400">お手数ですが、再試行してください。</p>
        <Button onClick={() => reset()}>再試行</Button>
      </div>
    </div>
  );
}
