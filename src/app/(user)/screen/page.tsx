import type { Metadata } from "next";
import { connection } from "next/server";

import { ScreenPage } from "@/features/user";
import { getLatestReachLog, getNumbers } from "@/lib/queries";

export const metadata: Metadata = {
  title: "スクリーン",
  description: "NUTFes Bingo の会場向けスクリーン表示ページです。",
};

export default async function Page() {
  await connection();

  const [numbers, latestReachLog] = await Promise.all([getNumbers(), getLatestReachLog()]);

  return <ScreenPage initialNumbers={numbers} initialReachLog={latestReachLog} />;
}
