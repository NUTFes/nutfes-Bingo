import "@fontsource/rajdhani/latin-700.css";

import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";

import {
  applyPublicTheme,
  DEFAULT_PUBLIC_PREFERENCES,
  resolveDarkModePreference,
} from "@/types/bingo/public-preferences";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("#root が見つかりません。");
}
const root = createRoot(rootElement);

const normalizedPath =
  window.location.pathname === "/" ? "/" : window.location.pathname.replace(/\/+$/, "") || "/";

function setDocumentTitle(title?: string) {
  document.title = title ? `${title} | NUTFes Bingo` : "NUTFes Bingo";
}

function AdminShell({ children }: { children: ReactNode }) {
  return <div className="dark min-h-screen">{children}</div>;
}

async function renderRoute() {
  let page: ReactNode;

  if (normalizedPath.startsWith("/admin")) {
    await import("@/styles/admin/globals.css");
    switch (normalizedPath) {
      case "/admin": {
        const { AdminDashboardPage } = await import("@/features/admin/dashboard/dashboard-page");
        setDocumentTitle("管理");
        page = <AdminDashboardPage />;
        break;
      }
      case "/admin/prizes": {
        const { AdminPrizesPage } = await import("@/features/admin/prizes/prizes-page");
        setDocumentTitle("景品管理");
        page = <AdminPrizesPage />;
        break;
      }
      case "/admin/prizes/new": {
        const { AdminPrizeCreatePage } = await import("@/features/admin/prizes/prize-create-page");
        setDocumentTitle("景品追加");
        page = <AdminPrizeCreatePage />;
        break;
      }
      default:
        setDocumentTitle("ページが見つかりません");
        page = <main className="p-6 text-foreground">ページが見つかりません。</main>;
    }
    root.render(<AdminShell>{page}</AdminShell>);
    return;
  }

  applyPublicTheme(resolveDarkModePreference(DEFAULT_PUBLIC_PREFERENCES.isDarkMode));
  await import("@/styles/user/globals.css");

  switch (normalizedPath) {
    case "/": {
      const { HomePage } = await import("@/features/user/home/home-page");
      setDocumentTitle();
      page = <HomePage />;
      break;
    }
    case "/prizes": {
      const { PrizesPage } = await import("@/features/user/prizes/prizes-page");
      setDocumentTitle("景品一覧");
      page = <PrizesPage />;
      break;
    }
    case "/screen": {
      const { ScreenPage } = await import("@/features/user/screen/screen-page");
      setDocumentTitle("会場画面");
      page = <ScreenPage />;
      break;
    }
    default:
      setDocumentTitle("ページが見つかりません");
      page = <main>ページが見つかりません。</main>;
  }

  root.render(page);
}

void renderRoute();
