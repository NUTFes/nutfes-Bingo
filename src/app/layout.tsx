import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "next-themes";

import {
  DEFAULT_PUBLIC_PREFERENCES,
  publicThemeBootstrapScript,
} from "@/lib/bingo/public-preferences";

import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

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

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "NUTFes Bingo",
    template: "%s | NUTFes Bingo",
  },
  description: "技大祭ビンゴ大会の番号表示・景品確認・運営管理を行うアプリケーション",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJp.variable} ${silom.variable} font-sans antialiased`}>
        <Script id="public-theme-bootstrap" strategy="beforeInteractive">
          {publicThemeBootstrapScript(DEFAULT_PUBLIC_PREFERENCES.isDarkMode)}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
