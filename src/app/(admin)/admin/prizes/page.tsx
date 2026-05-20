import { connection } from "next/server";

import { AdminPrizesPage } from "@/features/admin";
import { getPrizes } from "@/lib/queries";

export default async function Page() {
  await connection();

  const prizes = await getPrizes();

  return <AdminPrizesPage initialPrizes={prizes} />;
}
