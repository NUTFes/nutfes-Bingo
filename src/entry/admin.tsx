import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import AdminLoading from "@/components/admin/AdminLoading";
import { EMPTY_APP_STATE } from "@/types/bingo/types";
import "@/styles/fonts.css";
import "@/styles/admin/globals.css";

import { RouteErrorBoundary } from "./AppErrorBoundary";
import { RouteMetadata } from "./RouteMetadata";

const AdminDashboardPage = lazy(() =>
  import("@/features/admin").then(({ AdminDashboardPage }) => ({ default: AdminDashboardPage })),
);
const AdminPrizesPage = lazy(() =>
  import("@/features/admin").then(({ AdminPrizesPage }) => ({ default: AdminPrizesPage })),
);
const AdminPrizeCreatePage = lazy(() =>
  import("@/features/admin").then(({ AdminPrizeCreatePage }) => ({
    default: AdminPrizeCreatePage,
  })),
);

function NotFound() {
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="text-2xl font-semibold">ページが見つかりません</h1>
      <a href="/" className="underline">
        ホームへ戻る
      </a>
    </main>
  );
}

function AdminApp() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <div className="dark min-h-screen">
        <RouteErrorBoundary area="admin">
          <Suspense fallback={<AdminLoading />}>
            <Routes>
              <Route
                path="/admin"
                element={
                  <AdminDashboardPage initialNumbers={[]} initialAppState={EMPTY_APP_STATE} />
                }
              />
              <Route path="/admin/prizes" element={<AdminPrizesPage initialPrizes={[]} />} />
              <Route
                path="/admin/prizes/new"
                element={<AdminPrizeCreatePage initialPrizes={[]} />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
