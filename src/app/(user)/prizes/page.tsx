import type { Metadata } from "next";

import { PrizesPage } from "@/features/user";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/shared/domain/bingo/public-preferences";
import { getAppState, getPrizes } from "@/shared/data/queries";

export const metadata: Metadata = {
  title: "景品一覧",
  description: "NUTFes Bingo の景品一覧と当選状況を確認できます。",
};

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
