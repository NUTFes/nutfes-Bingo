import { PrizesPage } from "@/components/user/pages/prizes-page";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/lib/bingo/public-preferences";
import { getAppState, getPrizes } from "@/lib/bingo/queries";

export default async function Page() {
  const [prizes, appState] = await Promise.all([getPrizes(), getAppState()]);

  return (
    <PrizesPage
      initialPrizes={prizes}
      initialAppState={appState}
      initialPreferences={DEFAULT_PUBLIC_PREFERENCES}
    />
  );
}
