import { AdminPrizesPage } from "@/components/admin/features/prizes/prizes-page";
import { getPrizes } from "@/lib/bingo/queries";

export default async function Page() {
  const prizes = await getPrizes();

  return <AdminPrizesPage initialPrizes={prizes} />;
}
