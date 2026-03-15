import type { Metadata } from "next";

import { HomePage } from "@/features/user";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/shared/domain/bingo/public-preferences";
import { getAppState, getNumbers } from "@/shared/data/queries";

export const metadata: Metadata = {
  title: "ホーム",
  description: "NUTFes Bingo の抽選番号をリアルタイムで確認できます。",
};

export default async function Page() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return (
    <HomePage
      initialNumbers={numbers}
      initialAppState={appState}
      initialPreferences={DEFAULT_PUBLIC_PREFERENCES}
    />
  );
}
