import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Sans_JP } from "next/font/google";

const defaultUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const silom = localFont({
  src: "../../public/fonts/Silom.ttf",
  variable: "--font-silom",
  display: "swap",
});

const metadataBase = URL.parse(defaultUrl) ?? new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "NUTFes Bingo",
    template: "%s | NUTFes Bingo",
  },
  description: "技大祭ビンゴ大会の番号表示・景品確認・運営管理を行うアプリケーション",
  openGraph: {
    title: "NUTFes Bingo",
    description: "技大祭ビンゴ大会の番号表示・景品確認を行うアプリケーション",
    url: defaultUrl,
    siteName: "NUTFes Bingo",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NUTFes Bingo",
    description: "技大祭ビンゴ大会の番号表示・景品確認を行うアプリケーション",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJp.variable} ${silom.variable}`}>{children}</body>
    </html>
  );
}
