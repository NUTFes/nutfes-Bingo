import { connection } from "next/server";

import { AdminPrizesPage } from "@/features/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getPrizes } from "@/lib/queries";

export default async function Page() {
  await Promise.all([connection(), requireAdmin()]);
  const prizes = await getPrizes();

  return <AdminPrizesPage initialPrizes={prizes} />;
}
