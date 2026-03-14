import { HomePage } from "@/components/public/pages/home-page";
import { getAppState, getNumbers } from "@/lib/bingo/queries";

export default async function Page() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <HomePage initialNumbers={numbers} initialAppState={appState} />;
}
