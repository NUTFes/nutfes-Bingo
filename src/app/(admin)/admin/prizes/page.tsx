import { connection } from "next/server";

import { AdminPrizesPage } from "@/features/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getPrizes } from "@/lib/queries";

export default async function Page() {
  await connection();

  const [{ profile, user }, prizes] = await Promise.all([requireAdmin(), getPrizes()]);
  const adminUserLabel = profile.email || user.email || "Admin";

  return <AdminPrizesPage adminUserLabel={adminUserLabel} initialPrizes={prizes} />;
}
