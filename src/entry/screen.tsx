import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ScreenPage } from "@/features/user/screen";
import "@/styles/fonts.css";
import "@/styles/user/globals.css";

import { AppErrorBoundary } from "./AppErrorBoundary";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary area="screen">
      <ScreenPage />
    </AppErrorBoundary>
  </StrictMode>,
);
