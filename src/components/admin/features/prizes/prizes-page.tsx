"use client";

import { useState } from "react";

import { deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import Header from "@/components/admin/common/Header";
import PrizeResult from "@/components/admin/common/PrizeResult";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { SearchField } from "@/components/ui/SearchField";
import { Separator } from "@/components/ui/Separator";
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black pb-8 text-zinc-100 sm:pb-10">
      <MyToastRegion />
      <Header user="Admin" />

      <div className="mx-auto mt-6 w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">景品検索</h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                景品名で検索できます。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-5">
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
          </div>
        </section>

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
      </div>
    </div>
  );
}
