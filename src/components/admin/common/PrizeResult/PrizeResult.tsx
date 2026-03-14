"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { IoClose, IoCreateOutline } from "react-icons/io5";
import { GridLayout, GridList, GridListItem, Size, Virtualizer } from "react-aria-components";

import PrizeDeleteModal from "@/components/admin/common/PrizeDeleteModal/PrizeDeleteModal";
import PrizeEditModal from "@/components/admin/common/PrizeEditModal/PrizeEditModal";
import { AdminPanel } from "@/components/admin/ui/panel";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Button } from "@/components/ui/Button";
import { queue } from "@/components/ui/Toast";

interface PrizeResultProps {
  prizeResult: PrizeWithImageUrl[];
  setBingoPrize: React.Dispatch<React.SetStateAction<PrizeWithImageUrl[]>>;
  showOverlay: boolean;
  showToggle: boolean;
  onToggle: (id: number, isWon: boolean) => Promise<PrizeWithImageUrl>;
  onDelete: (prize: PrizeWithImageUrl) => Promise<void>;
  onUpdate: (params: {
    id: number;
    nameJp: string;
    nameEn: string;
    file?: File | null;
  }) => Promise<PrizeWithImageUrl>;
}

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export const PrizeResult = ({
  prizeResult,
  setBingoPrize,
  showOverlay,
  showToggle,
  onToggle,
  onDelete,
  onUpdate,
}: PrizeResultProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<PrizeWithImageUrl | null>(null);

  const sortedPrizes = useMemo(() => [...prizeResult].sort((a, b) => a.id - b.id), [prizeResult]);

  const handleToggleChange = async (id: number, isWon: boolean) => {
    try {
      const updated = await onToggle(id, isWon);
      setBingoPrize((prev) => prev.map((prize) => (prize.id === id ? updated : prize)));
      showToast({
        title: "更新完了",
        description: updated.is_won
          ? "景品を当選済みに変更しました。"
          : "景品を未当選に戻しました。",
      });
    } catch (error) {
      console.error(error);
      showToast({ title: "更新失敗", description: "景品状態の更新に失敗しました。" });
    }
  };

  const confirmDelete = async () => {
    if (!selected) {
      return;
    }

    try {
      await onDelete(selected);
      setBingoPrize((prev) => prev.filter((prize) => prize.id !== selected.id));
      showToast({ title: "削除完了", description: "景品を削除しました。" });
    } catch (error) {
      console.error(error);
      showToast({ title: "削除失敗", description: "景品の削除に失敗しました。" });
    } finally {
      setSelected(null);
      setIsDeleteOpen(false);
    }
  };

  const submitEdit = async (params: { nameJp: string; nameEn: string; file?: File | null }) => {
    if (!selected) {
      return;
    }

    try {
      const updated = await onUpdate({ id: selected.id, ...params });
      setBingoPrize((prev) => prev.map((prize) => (prize.id === selected.id ? updated : prize)));
      showToast({ title: "更新完了", description: "景品を更新しました。" });
    } catch (error) {
      console.error(error);
      showToast({ title: "更新失敗", description: "景品の更新に失敗しました。" });
      throw error;
    } finally {
      setSelected(null);
      setIsEditOpen(false);
    }
  };

  return (
    <div className="py-3 sm:py-4">
      <AdminPanel title="景品一覧" description={`${sortedPrizes.length}件の景品を表示しています。`}>
        <Virtualizer
          layout={GridLayout}
          layoutOptions={{
            minItemSize: new Size(236, 332),
            minSpace: new Size(16, 16),
            maxColumns: 5,
          }}
        >
          <GridList
            layout="grid"
            aria-label="景品一覧"
            selectionMode="none"
            items={sortedPrizes}
            className="block h-[42rem] w-full overflow-auto rounded-2xl"
          >
            {(prize) => (
              <GridListItem id={prize.id} textValue={prize.name_jp} className="h-full w-full p-0">
                <div
                  className="group relative flex h-full flex-col gap-3 rounded-2xl border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-3 text-[var(--admin-card-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--admin-border)] hover:shadow-md sm:p-4"
                  id={`prize-${prize.id}`}
                >
                  <div className="absolute right-2 top-2 z-10 flex gap-2">
                    <Button
                      variant="secondary"
                      aria-label="edit"
                      className="size-10 p-0"
                      onPress={() => {
                        setSelected(prize);
                        setIsEditOpen(true);
                      }}
                    >
                      <IoCreateOutline />
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label="delete"
                      className="size-10 p-0"
                      onPress={() => {
                        setSelected(prize);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <IoClose />
                    </Button>
                  </div>

                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--admin-surface-soft)_72%,var(--admin-card-bg))]">
                    {prize.image_url ? (
                      <Image
                        src={prize.image_url}
                        alt={prize.name_jp}
                        fill
                        sizes="(max-width: 768px) 42vw, 220px"
                      />
                    ) : null}
                    {showOverlay && prize.is_won && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--admin-overlay)]">
                        <p className="m-0 inline-flex w-4/5 items-center justify-center rounded-full bg-[var(--main-color)] px-3 py-2 text-base font-semibold text-[var(--admin-button-text)]">
                          当選済み
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="m-0 min-h-12 px-1 text-center text-base font-semibold leading-7 sm:text-lg">
                    {prize.name_jp}
                  </p>

                  {showToggle && (
                    <div className="mt-auto flex justify-center pb-0.5">
                      <label className="relative inline-flex h-10 w-20 cursor-pointer items-center">
                        <input
                          id={`toggle-${prize.id}`}
                          className="peer sr-only"
                          type="checkbox"
                          checked={prize.is_won}
                          onChange={(event) =>
                            void handleToggleChange(prize.id, event.target.checked)
                          }
                        />
                        <span className="h-full w-full rounded-full border-2 border-[color-mix(in_srgb,var(--admin-muted-text)_62%,transparent)] bg-[color-mix(in_srgb,var(--admin-surface-soft)_45%,var(--admin-card-bg))] transition-colors peer-checked:border-[var(--admin-border)] peer-checked:bg-[color-mix(in_srgb,var(--main-color)_18%,var(--admin-card-bg))]" />
                        <span className="absolute left-1 top-1 size-8 rounded-full border border-[color-mix(in_srgb,var(--admin-muted-text)_35%,transparent)] bg-[color-mix(in_srgb,var(--admin-card-text)_35%,var(--admin-card-bg))] shadow-sm transition-all peer-checked:left-11 peer-checked:border-[var(--main-color)] peer-checked:bg-[var(--main-color)]" />
                      </label>
                    </div>
                  )}
                </div>
              </GridListItem>
            )}
          </GridList>
        </Virtualizer>
      </AdminPanel>

      <PrizeDeleteModal
        isOpened={isDeleteOpen}
        setIsOpened={setIsDeleteOpen}
        prizeName={selected?.name_jp}
        onConfirm={confirmDelete}
      />
      {selected && (
        <PrizeEditModal
          isOpened={isEditOpen}
          setIsOpened={setIsEditOpen}
          id={selected.id}
          initialNameJp={selected.name_jp}
          initialNameEn={selected.name_en}
          initialImageUrl={selected.image_url}
          onSubmit={submitEdit}
        />
      )}
    </div>
  );
};

export default PrizeResult;
