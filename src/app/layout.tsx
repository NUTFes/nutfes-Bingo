import type { Metadata } from "next";
import { cookies } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const initialTheme = theme === "light" || theme === "dark" ? theme : "dark";
  const themeColor = initialTheme === "dark" ? "#2C252F" : "#FFFFFF";

  return (
    <html lang="ja" data-theme={initialTheme}>
      <head>
        <meta name="theme-color" content={themeColor} />
      </head>
      <body className={`${silom.variable} antialiased`}>{children}</body>
    </html>
  );
}
