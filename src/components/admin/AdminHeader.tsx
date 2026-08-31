import type { ReactNode } from "react";

import { cn } from "@/utils/utils";

interface HeaderProps {
  children?: ReactNode;
}

const COMMON_NAV_ITEMS = [
  { href: "/admin", label: "番号入力" },
  { href: "/admin/prizes", label: "景品一覧" },
  { href: "/admin/prizes/new", label: "景品追加" },
] as const;

const Header = ({ children }: HeaderProps) => {
  const currentPath = window.location.pathname.replace(/\/$/, "") || "";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a
              href="/admin"
              className="shrink-0 text-base font-semibold text-foreground transition-colors hover:text-foreground/80"
            >
              NUTFES BINGO
            </a>

            <nav className="hidden items-center gap-1 md:flex">
              {COMMON_NAV_ITEMS.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>

          {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-2 md:hidden">
          {COMMON_NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
