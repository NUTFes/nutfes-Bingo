import type { Metadata } from "next";

import { PrizesPage } from "@/features/user/prizes";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/types/bingo/public-preferences";
import { EMPTY_APP_STATE } from "@/types/bingo/types";

export const metadata: Metadata = {
  title: "景品一覧",
  description: "NUTFes Bingo の景品一覧と当選状況を確認できます。",
};

export default function Page() {
  return (
    <PrizesPage
      initialPrizes={[]}
      initialAppState={EMPTY_APP_STATE}
      initialPreferences={DEFAULT_PUBLIC_PREFERENCES}
    />
  );
}
