"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AdminActionBar, AdminButton, AdminPageContent } from "@/components/admin/ui";

interface HeaderProps {
  children: ReactNode;
  user: string;
}

const Header = ({ children, user }: HeaderProps) => {
  const router = useRouter();

  return (
    <header className="w-full border-b border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-bg)_94%,var(--admin-surface))] shadow-md">
      <AdminPageContent className="flex flex-col gap-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:py-5">
        <AdminButton
          variant="ghost"
          rounded="square"
          className="w-full justify-start px-1 py-1 text-left text-xl font-semibold leading-tight text-[var(--main-color)] sm:w-auto sm:text-2xl md:text-3xl"
          onClick={() => router.push("/admin")}
        >
          NUTFES BINGO {user}
        </AdminButton>
        <AdminActionBar className="w-full justify-start sm:w-auto sm:justify-end">
          {children}
        </AdminActionBar>
      </AdminPageContent>
    </header>
  );
};

export default Header;
