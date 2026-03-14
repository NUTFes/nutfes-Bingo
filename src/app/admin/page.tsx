import { DashboardPage } from "@/components/admin/pages/dashboard-page";
import { getAppState, getNumbers } from "@/lib/bingo/queries";

export default async function Page() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <DashboardPage initialNumbers={numbers} initialAppState={appState} />;
}
