"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

interface HeaderProps {
  children?: ReactNode;
  user: string;
}

const COMMON_NAV_ITEMS = [
  { href: "/admin", label: "番号入力" },
  { href: "/admin/prizes", label: "景品一覧" },
  { href: "/admin/prizes/new", label: "景品追加" },
] as const;

const Header = ({ children, user }: HeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => {
    const currentPath = pathname?.replace(/\/$/, "") || "";

    if (href === "/admin") {
      return currentPath === "/admin";
    }

    if (href === "/admin/prizes") {
      return currentPath === "/admin/prizes";
    }

    if (href === "/admin/prizes/new") {
      return currentPath === "/admin/prizes/new";
    }

    return false;
  };

  return (
    <header className="sticky top-0 z-20 w-full border-b border-zinc-700/80 bg-zinc-900/85 shadow-md backdrop-blur-md supports-backdrop-filter:bg-zinc-900/75">
      <div className="mx-auto w-full max-w-7xl px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Button
            variant="quiet"
            className="h-9 px-2 text-left text-base font-semibold leading-tight tracking-[0.01em] text-zinc-100 hover:bg-zinc-800/90 sm:text-lg"
            onPress={() => router.push("/admin")}
          >
            NUTFES BINGO {user}
          </Button>
          {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
        </div>
        <nav className="-mx-1 mt-2 overflow-x-auto pb-1">
          <ul className="flex min-w-max items-center gap-1.5 px-1">
            {COMMON_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Button
                  variant={isActive(item.href) ? "primary" : "secondary"}
                  onPress={() => router.push(item.href)}
                >
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
