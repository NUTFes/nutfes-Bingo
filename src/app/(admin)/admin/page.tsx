import { AdminDashboardPage } from "@/features/admin";
import { getAppState, getNumbers } from "@/shared/data/queries";

export default async function Page() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <AdminDashboardPage initialNumbers={numbers} initialAppState={appState} />;
}
