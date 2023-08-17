import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps) {
  useEffect(() => {
    if (!session) {
      router.push("/");
    }
  }, [router, session]);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
