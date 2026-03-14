import { AdminPrizeCreatePage } from "@/components/admin/features/prizes/prize-create-page";
import { getPrizes } from "@/lib/bingo/queries";

export default async function Page() {
  const prizes = await getPrizes();

  return <AdminPrizeCreatePage initialPrizes={prizes} />;
}
