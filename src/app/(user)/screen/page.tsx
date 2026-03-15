import type { Metadata } from "next";

import { ScreenPage } from "@/features/user";
import { getLatestReachLog, getNumbers } from "@/lib/queries";

export const metadata: Metadata = {
  title: "スクリーン",
  description: "NUTFes Bingo の会場向けスクリーン表示ページです。",
};

export default async function Page() {
  const [numbers, latestReachLog] = await Promise.all([getNumbers(), getLatestReachLog()]);

  return <ScreenPage initialNumbers={numbers} initialReachLog={latestReachLog} />;
}
