import { PrizesPage } from "@/components/public/pages/prizes-page";
import { getAppState, getPrizes } from "@/lib/bingo/queries";

export default async function Page() {
  const [prizes, appState] = await Promise.all([getPrizes(), getAppState()]);

  return <PrizesPage initialPrizes={prizes} initialAppState={appState} />;
}
