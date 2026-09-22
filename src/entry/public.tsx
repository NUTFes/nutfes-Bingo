import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import Loading from "@/components/user/Loading/Loading";
import "@/styles/fonts.css";
import "@/styles/user/globals.css";

import { RouteErrorBoundary } from "./AppErrorBoundary";
import { RouteMetadata } from "./RouteMetadata";

const HomePage = lazy(() =>
  import("@/features/user/home").then(({ HomePage }) => ({ default: HomePage })),
);
const PrizesPage = lazy(() =>
  import("@/features/user/prizes").then(({ PrizesPage }) => ({ default: PrizesPage })),
);

function NotFound() {
  return (
    <main>
      <h1>ページが見つかりません</h1>
      <a href="/">ホームへ戻る</a>
    </main>
  );
}

function PublicApp() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <RouteErrorBoundary area="public">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/prizes" element={<PrizesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <PublicApp />
  </StrictMode>,
);
