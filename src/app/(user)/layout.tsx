import Script from "next/script";

import {
  DEFAULT_PUBLIC_PREFERENCES,
  publicThemeBootstrapScript,
} from "@/types/bingo/public-preferences";

import "@/styles/user/globals.css";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="public-theme-bootstrap" strategy="beforeInteractive">
        {publicThemeBootstrapScript(DEFAULT_PUBLIC_PREFERENCES.isDarkMode)}
      </Script>
      {children}
    </>
  );
}
