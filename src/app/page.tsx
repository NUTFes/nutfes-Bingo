import { HomePage } from "@/components/user/pages/home-page";
import { DEFAULT_PUBLIC_PREFERENCES } from "@/lib/bingo/public-preferences";
import { getAppState, getNumbers } from "@/lib/bingo/queries";

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
