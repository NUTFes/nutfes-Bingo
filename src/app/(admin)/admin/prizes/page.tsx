import { connection } from "next/server";

import { AdminPrizesPage } from "@/features/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getPrizes } from "@/lib/queries";

export default async function Page() {
  await connection();

  const [, prizes] = await Promise.all([requireAdmin(), getPrizes()]);

  return <AdminPrizesPage initialPrizes={prizes} />;
}
