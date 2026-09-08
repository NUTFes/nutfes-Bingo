import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { ScreenPage } from "@/features/user/screen";
import "@/styles/fonts.css";
import "@/styles/user/globals.css";

import { RouteErrorBoundary } from "./AppErrorBoundary";
import { RouteMetadata } from "./RouteMetadata";

function NotFound() {
  return (
    <main>
      <h1>ページが見つかりません</h1>
      <a href="/">ホームへ戻る</a>
    </main>
  );
}

function ScreenApp() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <RouteErrorBoundary area="screen">
        <Routes>
          <Route
            path="/screen"
            element={<ScreenPage initialNumbers={[]} initialReachLog={null} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <ScreenApp />
  </StrictMode>,
);
