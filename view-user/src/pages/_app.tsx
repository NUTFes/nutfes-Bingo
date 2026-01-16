import "@/styles/reset.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { RecoilRoot, useSetRecoilState } from "recoil";
import { languageState } from "@/state/language";
import localFont from "next/font/local";

const silom = localFont({
  src: "../../public/fonts/Silom.ttf",
  variable: "--font-silom",
});

// const inter = Inter({ subsets: ["latin"] });

const LanguageSync: React.FC = () => {
  const { locale } = useRouter();
  const setLanguage = useSetRecoilState(languageState);

  useEffect(() => {
    setLanguage((locale as "ja" | "en") || "ja");
  }, [locale, setLanguage]);

  return null;
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <LanguageSync />
      <main className={silom.className}>
        <Component {...pageProps} />
      </main>
    </RecoilRoot>
  );
}
