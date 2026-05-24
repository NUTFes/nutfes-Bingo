"use client";

import { useState } from "react";

import { AdminHeader } from "@/components/admin";
import { usePrizesPolling } from "@/lib/polling";
import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { SearchField } from "@/components/ui/SearchField";
import { MyToastRegion } from "@/components/ui/Toast";
import PrizeResult from "./components/PrizeResult";
import { prizeActions } from "./actions-client";

interface AdminPrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
}

export function AdminPrizesPage({ initialPrizes }: AdminPrizesPageProps) {
  const [bingoPrize, setBingoPrize] = usePrizesPolling(initialPrizes);
  const [searchText, setSearchText] = useState("");

  const filteredPrizes = searchText
    ? bingoPrize.filter((prize) => prize.name_jp.toLowerCase().includes(searchText.toLowerCase()))
    : bingoPrize;

  return (
    <div className="min-h-screen bg-background pb-8 text-foreground sm:pb-10">
      <MyToastRegion />
      <AdminHeader />

      <div className="mx-auto mt-6 w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 sm:gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl space-y-1">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">景品管理</h2>
              <p className="text-sm text-muted-foreground">
                景品の追加、編集、当選状況の管理を行います。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <SearchField
                className="w-full sm:w-72"
                placeholder="景品名で検索"
                value={searchText}
                onChange={setSearchText}
              />
              <p className="shrink-0 inline-flex h-10 items-center rounded-full border border-border bg-card/50 px-4 text-sm text-muted-foreground">
                表示 {filteredPrizes.length} / 全 {bingoPrize.length} 件
              </p>
            </div>
          </header>
        </section>

        <PrizeResult
          prizeResult={filteredPrizes}
          setBingoPrize={setBingoPrize}
          showOverlay={true}
          showToggle={true}
          onToggle={async (id, isWon) => {
            const result = await prizeActions.togglePrizeWon(id, isWon);
            if (!result.ok) {
              throw new Error(result.error);
            }
            return result.data;
          }}
          onDelete={async (prize) => {
            const result = await prizeActions.deletePrize(prize.id);
            if (!result.ok) {
              throw new Error(result.error);
            }
          }}
          onUpdate={async ({ id, nameJp, nameEn, file }) => {
            const formData = new FormData();
            formData.set("id", String(id));
            formData.set("nameJp", nameJp);
            formData.set("nameEn", nameEn);
            if (file) {
              formData.set("file", file);
            }
            const result = await prizeActions.updatePrize(formData);
            if (!result.ok) {
              throw new Error(result.error);
            }
            return result.data;
          }}
        />
      </div>
    </div>
  );
}
