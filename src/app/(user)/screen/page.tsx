import type { Metadata } from "next";
import { connection } from "next/server";

import { ScreenPage } from "@/features/user";
import { getLatestReachLog, getLatestStampTriggerId, getNumbers } from "@/lib/queries";

export const metadata: Metadata = {
  title: "スクリーン",
  description: "NUTFes Bingo の会場向けスクリーン表示ページです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page() {
  await connection();

  const [numbers, latestReachLog, latestStampTriggerId] = await Promise.all([
    getNumbers(),
    getLatestReachLog(),
    getLatestStampTriggerId(),
  ]);

  return (
    <ScreenPage
      initialNumbers={numbers}
      initialReachLog={latestReachLog}
      initialStampCursor={latestStampTriggerId}
    />
  );
}
