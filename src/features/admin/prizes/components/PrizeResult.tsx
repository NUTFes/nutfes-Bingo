"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { GridLayout, GridList, GridListItem, Virtualizer } from "react-aria-components";
import { IoClose, IoCreateOutline } from "react-icons/io5";

import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import { queue } from "@/components/ui/toastQueue";
import PrizeDeleteModal from "./PrizeDeleteModal";
import PrizeEditModal from "./PrizeEditModal";

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

const PrizeResult = ({
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

  const sortedPrizes = useMemo(() => prizeResult.toSorted((a, b) => a.id - b.id), [prizeResult]);

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
    } finally {
      setSelected(null);
      setIsEditOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="space-y-4 sm:space-y-5">
          <Virtualizer
            layout={GridLayout}
            layoutOptions={{
              maxColumns: 5,
            }}
          >
            <GridList layout="grid" aria-label="景品一覧" items={sortedPrizes}>
              {(prize) => (
                <GridListItem id={prize.id} textValue={prize.name_jp}>
                  <div
                    className="group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-3 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-md sm:p-4"
                    id={`prize-${prize.id}`}
                  >
                    <div className="absolute right-2 top-2 z-10 flex gap-2">
                      <Button
                        variant="secondary"
                        aria-label="edit"
                        className="size-9 p-0"
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
                        className="size-9 p-0"
                        onPress={() => {
                          setSelected(prize);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <IoClose />
                      </Button>
                    </div>

                    <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border bg-background">
                      {prize.image_url ? (
                        <Image
                          src={prize.image_url}
                          alt={prize.name_jp}
                          fill
                          sizes="(max-width: 768px) 42vw, 220px"
                          className="bg-white object-contain p-2"
                        />
                      ) : null}
                      {showOverlay && prize.is_won && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                          <p className="m-0 inline-flex w-4/5 items-center justify-center rounded-full bg-amber-400 px-3 py-2 text-base font-semibold text-amber-900">
                            当選済み
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 px-1 text-center">
                      <p className="font-medium text-foreground">{prize.name_jp}</p>
                    </div>

                    {showToggle && (
                      <div className="mt-auto pb-0.5">
                        <div className="flex justify-center">
                          <Switch
                            id={`toggle-${prize.id}`}
                            aria-label={`${prize.name_jp}の当選状態`}
                            isSelected={prize.is_won}
                            onChange={(isSelected) => void handleToggleChange(prize.id, isSelected)}
                          >
                            <span className="text-xs font-medium text-foreground">
                              {prize.is_won ? "当選済み" : "未当選"}
                            </span>
                          </Switch>
                        </div>
                      </div>
                    )}
                  </div>
                </GridListItem>
              )}
            </GridList>
          </Virtualizer>
        </div>
      </div>

      <PrizeDeleteModal
        isOpened={isDeleteOpen}
        setIsOpened={setIsDeleteOpen}
        prizeName={selected?.name_jp}
        onConfirm={confirmDelete}
      />
      {selected && isEditOpen && (
        <PrizeEditModal
          key={selected.id}
          isOpened={isEditOpen}
          setIsOpened={(nextOpen) => {
            setIsEditOpen(nextOpen);
            if (!nextOpen) {
              setSelected(null);
            }
          }}
          id={selected.id}
          initialNameJp={selected.name_jp}
          initialNameEn={selected.name_en}
          initialImageUrl={selected.image_url}
          onSubmit={submitEdit}
        />
      )}
    </>
  );
};

export default PrizeResult;
