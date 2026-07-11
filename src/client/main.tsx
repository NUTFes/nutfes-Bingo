import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AdminView } from "./admin-view";
import { HomeView } from "./home-view";
import { PrizesView } from "./prizes-view";
import { ScreenView } from "./screen-view";
import "./styles.css";

function App() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/") return <HomeView />;
  if (path === "/prizes") return <PrizesView />;
  if (path === "/screen") return <ScreenView />;
  if (path === "/admin") return <AdminView />;
  return (
    <main className="center-page">
      <h1>404</h1>
      <a href="/">Back to bingo</a>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
