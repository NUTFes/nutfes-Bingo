import { AdminDashboardPage } from "@/features/admin";
import { EMPTY_APP_STATE } from "@/types/bingo/types";

export default function Page() {
  return <AdminDashboardPage initialNumbers={[]} initialAppState={EMPTY_APP_STATE} />;
}
