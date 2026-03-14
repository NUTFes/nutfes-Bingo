"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { AdminPageContent } from "@/components/admin/ui/layout";

interface HeaderProps {
  children: ReactNode;
  user: string;
}

const Header = ({ children, user }: HeaderProps) => {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 w-full border-b border-[var(--admin-border-subtle)] bg-[#1B1B1B] backdrop-blur supports-[backdrop-filter]:bg-[#1B1B1B]">
      <AdminPageContent className="flex flex-col gap-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5 sm:py-5">
        <Button
          variant="quiet"
          className="h-auto w-fit px-1 py-1 text-left text-xl font-semibold leading-tight text-[var(--main-color)] sm:text-2xl"
          onPress={() => router.push("/admin")}
        >
          NUTFES BINGO {user}
        </Button>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end sm:gap-4">
          {children}
        </div>
      </AdminPageContent>
    </header>
  );
};

export default Header;
