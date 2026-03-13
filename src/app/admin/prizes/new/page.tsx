import { Suspense } from "react";

import { PrizeCreatePage } from "@/components/admin/pages/prize-create-page";
import { getPrizes } from "@/lib/bingo/queries";
import { requireAdmin } from "@/lib/auth";

function LoadingFallback() {
  return <div>読み込み中...</div>;
}

async function AdminPrizeCreateContent() {
  await requireAdmin();
  const prizes = await getPrizes();

  return <PrizeCreatePage initialPrizes={prizes} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPrizeCreateContent />
    </Suspense>
  );
}
