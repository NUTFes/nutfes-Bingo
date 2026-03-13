import { Suspense } from "react";

import { HomePage } from "@/components/public/pages/home-page";
import { getAppState, getNumbers } from "@/lib/bingo/queries";

function LoadingFallback() {
  return <div>読み込み中...</div>;
}

async function HomeContent() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <HomePage initialNumbers={numbers} initialAppState={appState} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
