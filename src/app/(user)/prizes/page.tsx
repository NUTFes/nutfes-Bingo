import type { Metadata } from "next";
import { connection } from "next/server";

import { PrizesPage } from "@/features/user";
import { getAppState, getPrizes } from "@/lib/queries";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/types/bingo/public-preferences";

export const metadata: Metadata = {
  title: "景品一覧",
  description: "NUTFes Bingo の景品一覧と当選状況を確認できます。",
};

export default async function Page() {
  await connection();

  const [prizes, appState] = await Promise.all([getPrizes(), getAppState()]);

  return (
    <PrizesPage
      initialPrizes={prizes}
      initialAppState={appState}
      initialPreferences={DEFAULT_PUBLIC_PREFERENCES}
    />
  );
}
