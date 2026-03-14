import { ScreenPage } from "@/components/public/pages/screen-page";
import { getLatestReachLog, getNumbers } from "@/lib/bingo/queries";

export default async function Page() {
  const [numbers, latestReachLog] = await Promise.all([getNumbers(), getLatestReachLog()]);

  return <ScreenPage initialNumbers={numbers} initialReachLog={latestReachLog} />;
}
