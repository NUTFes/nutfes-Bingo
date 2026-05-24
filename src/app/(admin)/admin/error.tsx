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
    <div className="flex h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/90 p-6 text-center text-card-foreground shadow-2xl sm:p-7">
        <p className="mb-2 text-base font-semibold sm:text-lg">管理画面でエラーが発生しました。</p>
        <p className="mb-5 text-sm text-muted-foreground">お手数ですが、再試行してください。</p>
        <Button onClick={() => reset()}>再試行</Button>
      </div>
    </div>
  );
}
