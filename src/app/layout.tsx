import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/reset.css";
import "@/styles/globals.css";

const silom = localFont({
  src: "../../public/fonts/Silom.ttf",
  variable: "--font-silom",
});

export const metadata: Metadata = {
  title: "NUTFes Bingo",
  description: "NUTFes Bingo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${silom.variable} antialiased`}>{children}</body>
    </html>
  );
}
