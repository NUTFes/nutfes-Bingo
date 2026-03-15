import { AdminPrizeCreatePage } from "@/features/admin";
import { getPrizes } from "@/lib/queries";

export default async function Page() {
  const prizes = await getPrizes();

  return <AdminPrizeCreatePage initialPrizes={prizes} />;
}
