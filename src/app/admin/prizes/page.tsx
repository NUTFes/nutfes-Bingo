import { Suspense } from "react";

import { AdminPrizesPage } from "@/components/admin/pages/prizes-page";
import { getPrizes } from "@/lib/bingo/queries";
import { requireAdmin } from "@/lib/auth";

function LoadingFallback() {
  return <div>読み込み中...</div>;
}

async function AdminPrizesContent() {
  await requireAdmin();
  const prizes = await getPrizes();

  return <AdminPrizesPage initialPrizes={prizes} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminPrizesContent />
    </Suspense>
  );
}
