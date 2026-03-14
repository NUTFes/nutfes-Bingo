import { AdminDashboardPage } from "@/components/admin/features/dashboard/dashboard-page";
import { getAppState, getNumbers } from "@/lib/bingo/queries";

export default async function Page() {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <AdminDashboardPage initialNumbers={numbers} initialAppState={appState} />;
}
