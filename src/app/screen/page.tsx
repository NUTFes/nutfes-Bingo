import { Suspense } from "react";

import { ScreenPage } from "@/components/public/pages/screen-page";
import { getLatestReachLog, getNumbers } from "@/lib/bingo/queries";

function LoadingFallback() {
  return <div>読み込み中...</div>;
}

async function ScreenContent() {
  const [numbers, latestReachLog] = await Promise.all([getNumbers(), getLatestReachLog()]);

  return <ScreenPage initialNumbers={numbers} initialReachLog={latestReachLog} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ScreenContent />
    </Suspense>
  );
}
