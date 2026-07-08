"use client";

import { useState } from "react";
import { IoSwapVerticalOutline } from "react-icons/io5";

import { AdminHeader } from "@/components/admin";
import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { SearchField } from "@/components/ui/SearchField";
import { Button } from "@/components/ui/Button";
import { MyToastRegion } from "@/components/ui/Toast";
import PrizeResult from "./components/PrizeResult";
import { prizeActions } from "./actions-client";

interface AdminPrizesPageProps {
  initialPrizes: PrizeWithImageUrl[];
}

export function AdminPrizesPage({ initialPrizes }: AdminPrizesPageProps) {
  const [bingoPrize, setBingoPrize] = useState(initialPrizes);
  const [searchText, setSearchText] = useState("");
  const [isReorderMode, setIsReorderMode] = useState(false);
  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (value) {
      setIsReorderMode(false);
    }
  };

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
              <h2 className="text-xl font-medium text-foreground">景品管理</h2>
              <p className="text-sm text-muted-foreground">
                景品の追加、編集、当選状況、表示順の管理を行います。
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <SearchField
                aria-label="景品名で検索"
                className="w-full sm:w-72"
                placeholder="景品名で検索"
                value={searchText}
                onChange={handleSearchChange}
              />
              <div className="flex shrink-0 items-center text-sm text-muted-foreground">
                表示 {filteredPrizes.length} / 全 {bingoPrize.length} 件
              </div>
              <Button
                variant={isReorderMode ? "secondary" : "primary"}
                isDisabled={Boolean(searchText) || bingoPrize.length < 2}
                onPress={() => setIsReorderMode((prev) => !prev)}
              >
                <IoSwapVerticalOutline className="size-4" aria-hidden />
                <span>{isReorderMode ? "並び替え終了" : "並び替えモード"}</span>
              </Button>
            </div>
            {isReorderMode && !searchText && (
              <p className="basis-full text-sm text-muted-foreground">
                ドラッグまたは ▲▼ ボタンで順番を変更できます（変更は即時保存されます）
              </p>
            )}
            {searchText && (
              <p className="basis-full text-sm text-muted-foreground">
                検索中は並び替えが無効になります
              </p>
            )}
          </header>
        </section>

        <PrizeResult
          prizeResult={filteredPrizes}
          setBingoPrize={setBingoPrize}
          showOverlay={true}
          showToggle={true}
          canReorder={isReorderMode && !searchText}
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
          onReorder={async (orderedIds) => {
            const result = await prizeActions.reorderPrizeGroup(orderedIds);
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
