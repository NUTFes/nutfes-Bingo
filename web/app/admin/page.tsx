import { Suspense } from "react";

import { DashboardPage } from "@/components/admin/pages/dashboard-page";
import { getAppState, getNumbers } from "@/lib/bingo/queries";
import { requireAdmin } from "@/lib/auth";

function LoadingFallback() {
  return <div>読み込み中...</div>;
}

async function AdminDashboardContent() {
  await requireAdmin();
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);

  return <DashboardPage initialNumbers={numbers} initialAppState={appState} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
