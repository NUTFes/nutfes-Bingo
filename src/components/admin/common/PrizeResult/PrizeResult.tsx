"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { IoClose, IoCreateOutline } from "react-icons/io5";
import { toast } from "react-toastify";

import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { AdminPanel, AdminButton } from "@/components/admin/ui";
import PrizeDeleteModal from "@/components/admin/common/PrizeDeleteModal/PrizeDeleteModal";
import PrizeEditModal from "@/components/admin/common/PrizeEditModal/PrizeEditModal";

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
    } catch (error) {
      console.error(error);
      toast.error("景品状態の更新に失敗しました");
    }
  };

  const confirmDelete = async () => {
    if (!selected) {
      return;
    }

    try {
      await onDelete(selected);
      setBingoPrize((prev) => prev.filter((prize) => prize.id !== selected.id));
      toast.success("景品を削除しました");
    } catch (error) {
      console.error(error);
      toast.error("景品の削除に失敗しました");
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
      toast.success("景品を更新しました");
    } catch (error) {
      console.error(error);
      toast.error("景品の更新に失敗しました");
      throw error;
    } finally {
      setSelected(null);
      setIsEditOpen(false);
    }
  };

  return (
    <div className="py-3 sm:py-4">
      <AdminPanel title="景品一覧" description={`${sortedPrizes.length}件の景品を表示しています。`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sortedPrizes.map((prize) => (
            <div
              className="group relative flex flex-col gap-3 rounded-2xl border border-[var(--admin-card-border)] bg-[var(--admin-card-bg)] p-3 text-[var(--admin-card-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--admin-border)] hover:shadow-md sm:p-4"
              key={prize.id}
              id={`prize-${prize.id}`}
            >
              <div className="absolute right-2 top-2 z-10 flex gap-2">
                <AdminButton
                  variant="icon"
                  size="icon"
                  aria-label="edit"
                  onClick={() => {
                    setSelected(prize);
                    setIsEditOpen(true);
                  }}
                >
                  <IoCreateOutline />
                </AdminButton>
                <AdminButton
                  variant="icon"
                  size="icon"
                  aria-label="delete"
                  onClick={() => {
                    setSelected(prize);
                    setIsDeleteOpen(true);
                  }}
                >
                  <IoClose />
                </AdminButton>
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
                      onChange={(event) => void handleToggleChange(prize.id, event.target.checked)}
                    />
                    <span className="h-full w-full rounded-full border-2 border-[color-mix(in_srgb,var(--admin-muted-text)_62%,transparent)] bg-[color-mix(in_srgb,var(--admin-surface-soft)_45%,var(--admin-card-bg))] transition-colors peer-checked:border-[var(--admin-border)] peer-checked:bg-[color-mix(in_srgb,var(--main-color)_18%,var(--admin-card-bg))]" />
                    <span className="absolute left-1 top-1 size-8 rounded-full border border-[color-mix(in_srgb,var(--admin-muted-text)_35%,transparent)] bg-[color-mix(in_srgb,var(--admin-card-text)_35%,var(--admin-card-bg))] shadow-sm transition-all peer-checked:left-11 peer-checked:border-[var(--main-color)] peer-checked:bg-[var(--main-color)]" />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
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
