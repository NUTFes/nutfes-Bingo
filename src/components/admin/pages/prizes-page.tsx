"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";

import { deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Header, PrizeResult } from "@/components/admin/common";
import {
  AdminButton,
  AdminInput,
  AdminPageContent,
  AdminPageShell,
  AdminPanel,
} from "@/components/admin/ui";

interface AdminPrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
}

export function AdminPrizesPage({ initialPrizes }: AdminPrizesPageProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [bingoPrize, setBingoPrize] = useState<PrizeWithImageUrl[]>(initialPrizes);
  const [searchText, setSearchText] = useState("");

  const searchResults = searchText
    ? bingoPrize.filter((prize) => prize.name_jp.toLowerCase().includes(searchText.toLowerCase()))
    : [];

  const handleSearch = () => {
    if (!searchRef.current || searchResults.length === 0) {
      return;
    }

    const firstResultElement = document.getElementById(`prize-${searchResults[0].id}`);
    firstResultElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <AdminPageShell>
      <ToastContainer position="top-center" />
      <Header user="Admin">
        <AdminButton rounded="pill" onClick={() => router.push("/admin")}>
          番号入力
        </AdminButton>
      </Header>

      <AdminPageContent className="mt-6">
        <AdminPanel
          title="景品検索"
          description="景品名で一覧を絞り込み、先頭一致の景品へスクロールします。"
        >
          <div className="flex flex-wrap items-end gap-4 max-sm:flex-col max-sm:items-stretch">
            <AdminInput
              ref={searchRef}
              type="text"
              placeholder="検索..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <AdminButton className="min-w-32" onClick={handleSearch}>
              検索
            </AdminButton>
          </div>
        </AdminPanel>
      </AdminPageContent>

      <AdminPageContent className="mt-6">
        <PrizeResult
          prizeResult={searchText !== "" && searchResults.length > 0 ? searchResults : bingoPrize}
          setBingoPrize={setBingoPrize}
          showOverlay={true}
          showToggle={true}
          onToggle={async (id, isWon) => {
            return togglePrizeWon(id, isWon);
          }}
          onDelete={async (prize) => {
            await deletePrize(prize.id);
          }}
          onUpdate={async ({ id, nameJp, nameEn, file }) => {
            const formData = new FormData();
            formData.set("id", String(id));
            formData.set("nameJp", nameJp);
            formData.set("nameEn", nameEn);
            if (file) {
              formData.set("file", file);
            }
            return updatePrize(formData);
          }}
        />
      </AdminPageContent>
    </AdminPageShell>
  );
}
