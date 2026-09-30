import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { HomePage } from "@/features/user/home";
import { PrizesPage } from "@/features/user/prizes";
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

function PublicApp() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <RouteErrorBoundary area="public">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/prizes" element={<PrizesPage />} />
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
    <PublicApp />
  </StrictMode>,
);
