import { connection } from "next/server";

import { AdminDashboardPage } from "@/features/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getAppState, getNumbers } from "@/lib/queries";

export default async function Page() {
  await Promise.all([connection(), requireAdmin()]);
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <AdminDashboardPage initialNumbers={numbers} initialAppState={appState} />;
}
