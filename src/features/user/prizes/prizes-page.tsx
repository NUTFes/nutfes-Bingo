import Layout from "@/components/user/Layout/Layout";
import PrizeCardList from "@/components/user/cards/PrizeCardList/PrizeCardList";
import Loading from "@/components/user/Loading";
import { usePrizesRealtimeState } from "@/lib/realtime";

export function PrizesPage() {
  const { prizes, appState, isReady } = usePrizesRealtimeState();

  if (!isReady) {
    return <Loading />;
  }

  return (
    <Layout appState={appState}>
      <PrizeCardList prizes={prizes} />
    </Layout>
  );
}
