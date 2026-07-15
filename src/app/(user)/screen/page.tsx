import type { Metadata } from "next";

import { ScreenPage } from "@/features/user";

export const metadata: Metadata = {
  title: "スクリーン",
  description: "NUTFes Bingo の会場向けスクリーン表示ページです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <ScreenPage initialNumbers={[]} initialReachLog={null} />;
}
