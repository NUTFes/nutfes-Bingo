import { connection } from "next/server";

import { AdminPrizeCreatePage } from "@/features/admin";
import { getPrizes } from "@/lib/queries";

export default async function Page() {
  await connection();

  const prizes = await getPrizes();

  return <AdminPrizeCreatePage initialPrizes={prizes} />;
}
