import { AdminDashboardPage } from "@/features/admin";
import { getAppState, getNumbers } from "@/lib/queries";

export default async function Page() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <AdminDashboardPage initialNumbers={numbers} initialAppState={appState} />;
}
