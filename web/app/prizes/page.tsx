import { Suspense } from "react";

import { PrizesPage } from "@/components/public/pages/prizes-page";
import { getAppState, getPrizes } from "@/lib/bingo/queries";

function LoadingFallback() {
  return <div>読み込み中...</div>;
}

async function PrizesContent() {
  const [prizes, appState] = await Promise.all([getPrizes(), getAppState()]);

  return <PrizesPage initialPrizes={prizes} initialAppState={appState} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PrizesContent />
    </Suspense>
  );
}
