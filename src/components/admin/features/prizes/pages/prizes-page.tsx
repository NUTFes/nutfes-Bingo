"use client";

import { useState } from "react";

import { deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import Header from "@/components/admin/common/Header/Header";
import PrizeResult from "@/components/admin/common/PrizeResult/PrizeResult";
import { AdminPageContent, AdminPageShell } from "@/components/admin/ui/layout";
import { AdminPanel } from "@/components/admin/ui/panel";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { SearchField } from "@/components/ui/SearchField";
import { MyToastRegion } from "@/components/ui/Toast";

interface AdminPrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
}

export function AdminPrizesPage({ initialPrizes }: AdminPrizesPageProps) {
  const [bingoPrize, setBingoPrize] = useState<PrizeWithImageUrl[]>(initialPrizes);
  const [searchText, setSearchText] = useState("");

  const filteredPrizes = searchText
    ? bingoPrize.filter((prize) => prize.name_jp.toLowerCase().includes(searchText.toLowerCase()))
    : bingoPrize;

  return (
    <AdminPageShell>
      <MyToastRegion />
      <Header user="Admin" />

      <AdminPageContent className="mt-6 space-y-6">
        <AdminPanel
          title="景品検索"
          description="景品名で検索できます。"
          contentClassName="space-y-5"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
            <SearchField
              className="w-full max-w-md"
              placeholder="景品名で検索"
              value={searchText}
              onChange={setSearchText}
            />
            <p className="inline-flex h-10 items-center rounded-full border border-zinc-700 bg-zinc-800/80 px-4 text-sm text-zinc-400">
              全 {bingoPrize.length} 件 / 表示 {filteredPrizes.length} 件
            </p>
          </div>
        </AdminPanel>

        <PrizeResult
          prizeResult={filteredPrizes}
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
