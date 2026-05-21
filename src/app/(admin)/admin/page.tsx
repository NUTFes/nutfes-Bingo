import { connection } from "next/server";

import { AdminDashboardPage } from "@/features/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getAppState, getNumbers } from "@/lib/queries";

export default async function Page() {
  await connection();

  const [{ profile, user }, numbers, appState] = await Promise.all([
    requireAdmin(),
    getNumbers(),
    getAppState(),
  ]);
  const adminUserLabel = profile.email || user.email || "Admin";

  return (
    <AdminDashboardPage
      adminUserLabel={adminUserLabel}
      initialNumbers={numbers}
      initialAppState={appState}
    />
  );
}
