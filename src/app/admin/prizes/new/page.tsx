import { PrizeCreatePage } from "@/components/admin/pages/prize-create-page";
import { getPrizes } from "@/lib/bingo/queries";

export default async function Page() {
  const prizes = await getPrizes();

  return <PrizeCreatePage initialPrizes={prizes} />;
}
