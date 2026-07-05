"use client";

import Image from "next/image";
import React, { type DragEvent, useMemo, useRef, useState } from "react";
import { GridLayout, GridList, GridListItem, Virtualizer } from "react-aria-components";
import { IoChevronDown, IoChevronUp, IoClose, IoCreateOutline } from "react-icons/io5";

import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { Button } from "@/components/ui/Button";
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
  canReorder?: boolean;
  onDelete: (prize: PrizeWithImageUrl) => Promise<void>;
  onReorder?: (orderedIds: number[]) => Promise<PrizeWithImageUrl[]>;
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

const comparePrizeOrder = (a: PrizeWithImageUrl, b: PrizeWithImageUrl) => {
  const wonOrder = Number(a.is_won) - Number(b.is_won);
  if (wonOrder !== 0) {
    return wonOrder;
  }
  return a.sort_order - b.sort_order || a.id - b.id;
};

type MoveDirection = "up" | "down";

interface PrizeGridItemProps {
  prize: PrizeWithImageUrl;
  display: {
    showOverlay: boolean;
    showToggle: boolean;
  };
  reorder: {
    canDrag: boolean;
    isDragging: boolean;
  } | null;
  onDragStart: (event: DragEvent<HTMLDivElement>, prize: PrizeWithImageUrl) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, prize: PrizeWithImageUrl) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, prize: PrizeWithImageUrl) => void;
  onDragEnd: () => void;
  onMove: (prize: PrizeWithImageUrl, direction: MoveDirection) => void;
  isMoveDisabled: (prize: PrizeWithImageUrl, direction: MoveDirection) => boolean;
  onEditClick: (prize: PrizeWithImageUrl) => void;
  onDeleteClick: (prize: PrizeWithImageUrl) => void;
  onToggleChange: (id: number, isWon: boolean) => void;
}

const PrizeGridItem = ({
  prize,
  display,
  reorder,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove,
  isMoveDisabled,
  onEditClick,
  onDeleteClick,
  onToggleChange,
}: PrizeGridItemProps) => (
  <GridListItem id={prize.id} textValue={prize.name_jp}>
    <div
      className={`group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-3 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-md sm:p-4 ${
        reorder?.canDrag ? "cursor-grab active:cursor-grabbing" : ""
      } ${reorder?.isDragging ? "opacity-60 ring-2 ring-primary" : ""}`}
      id={`prize-${prize.id}`}
      draggable={reorder?.canDrag ?? false}
      onDragStart={(event) => onDragStart(event, prize)}
      onDragOver={(event) => onDragOver(event, prize)}
      onDrop={(event) => onDrop(event, prize)}
      onDragEnd={onDragEnd}
    >
      {reorder && (
        <div className="absolute left-2 top-2 z-10 flex gap-1">
          <Button
            variant="secondary"
            aria-label={`${prize.name_jp}を上へ移動`}
            className="size-8 p-0"
            isDisabled={isMoveDisabled(prize, "up")}
            onPress={() => onMove(prize, "up")}
          >
            <IoChevronUp />
          </Button>
          <Button
            variant="secondary"
            aria-label={`${prize.name_jp}を下へ移動`}
            className="size-8 p-0"
            isDisabled={isMoveDisabled(prize, "down")}
            onPress={() => onMove(prize, "down")}
          >
            <IoChevronDown />
          </Button>
        </div>
      )}

      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <Button
          variant="secondary"
          aria-label="edit"
          className="size-9 p-0"
          onPress={() => onEditClick(prize)}
        >
          <IoCreateOutline />
        </Button>
        <Button
          variant="secondary"
          aria-label="delete"
          className="size-9 p-0"
          onPress={() => onDeleteClick(prize)}
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
            draggable={false}
          />
        ) : null}
        {display.showOverlay && prize.is_won && (
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

      {display.showToggle && (
        <div className="mt-auto pb-0.5">
          <div className="flex justify-center">
            <Switch
              id={`toggle-${prize.id}`}
              aria-label={`${prize.name_jp}の当選状態`}
              isSelected={prize.is_won}
              onChange={(isSelected) => onToggleChange(prize.id, isSelected)}
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
);

const PrizeResult = ({
  prizeResult,
  setBingoPrize,
  showOverlay,
  showToggle,
  canReorder = false,
  onToggle,
  onReorder,
  onDelete,
  onUpdate,
}: PrizeResultProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<PrizeWithImageUrl | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);
  const [draggedPrizeId, setDraggedPrizeId] = useState<number | null>(null);
  const draggedPrizeIdRef = useRef<number | null>(null);

  const sortedPrizes = useMemo(() => prizeResult.toSorted(comparePrizeOrder), [prizeResult]);

  const { unwonPrizeIds, wonPrizeIds } = useMemo(() => {
    const unwonIds: number[] = [];
    const wonIds: number[] = [];
    for (const prize of sortedPrizes) {
      if (prize.is_won) {
        wonIds.push(prize.id);
      } else {
        unwonIds.push(prize.id);
      }
    }
    return { unwonPrizeIds: unwonIds, wonPrizeIds: wonIds };
  }, [sortedPrizes]);
  const prizePositions = useMemo(() => {
    const positions = new Map<number, { ids: number[]; index: number }>();
    [unwonPrizeIds, wonPrizeIds].forEach((ids) => {
      ids.forEach((id, index) => {
        positions.set(id, { ids, index });
      });
    });
    return positions;
  }, [unwonPrizeIds, wonPrizeIds]);

  const applyReorder = async (orderedIds: number[], movedId: number) => {
    if (!onReorder) {
      return;
    }

    try {
      setMovingId(movedId);
      const reordered = await onReorder(orderedIds);
      setBingoPrize(reordered);
      showToast({ title: "並び替え完了", description: "景品の表示順を更新しました。" });
    } catch (error) {
      console.error(error);
      showToast({ title: "並び替え失敗", description: "景品の表示順更新に失敗しました。" });
    } finally {
      setMovingId(null);
      setDraggedPrizeId(null);
      draggedPrizeIdRef.current = null;
    }
  };

  const handleMove = async (prize: PrizeWithImageUrl, direction: "up" | "down") => {
    if (!canReorder || !onReorder || movingId !== null) {
      return;
    }

    const position = prizePositions.get(prize.id);
    if (!position) {
      return;
    }

    const targetIndex = direction === "up" ? position.index - 1 : position.index + 1;
    if (targetIndex < 0 || targetIndex >= position.ids.length) {
      return;
    }

    const nextIds = [...position.ids];
    const [movedId] = nextIds.splice(position.index, 1);
    nextIds.splice(targetIndex, 0, movedId);
    await applyReorder(nextIds, prize.id);
  };

  const isMoveDisabled = (prize: PrizeWithImageUrl, direction: "up" | "down") => {
    const position = prizePositions.get(prize.id);
    if (!canReorder || !onReorder || movingId !== null || !position) {
      return true;
    }
    return direction === "up" ? position.index === 0 : position.index === position.ids.length - 1;
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, prize: PrizeWithImageUrl) => {
    if (!canReorder || !onReorder || movingId !== null) {
      event.preventDefault();
      return;
    }

    draggedPrizeIdRef.current = prize.id;
    setDraggedPrizeId(prize.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", prize.id.toString());
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, targetPrize: PrizeWithImageUrl) => {
    const currentDraggedPrizeId = draggedPrizeIdRef.current;
    if (!canReorder || !onReorder || currentDraggedPrizeId === null || movingId !== null) {
      return;
    }

    const draggedPrize = sortedPrizes.find((prize) => prize.id === currentDraggedPrizeId);
    if (
      !draggedPrize ||
      draggedPrize.id === targetPrize.id ||
      draggedPrize.is_won !== targetPrize.is_won
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetPrize: PrizeWithImageUrl) => {
    event.preventDefault();
    const currentDraggedPrizeId = draggedPrizeIdRef.current;
    if (!canReorder || !onReorder || currentDraggedPrizeId === null || movingId !== null) {
      draggedPrizeIdRef.current = null;
      setDraggedPrizeId(null);
      return;
    }

    const draggedPrize = sortedPrizes.find((prize) => prize.id === currentDraggedPrizeId);
    if (
      !draggedPrize ||
      draggedPrize.id === targetPrize.id ||
      draggedPrize.is_won !== targetPrize.is_won
    ) {
      draggedPrizeIdRef.current = null;
      setDraggedPrizeId(null);
      return;
    }

    const groupIds = targetPrize.is_won ? wonPrizeIds : unwonPrizeIds;
    const withoutDragged = groupIds.filter((id) => id !== draggedPrize.id);
    const targetIndex = withoutDragged.indexOf(targetPrize.id);
    if (targetIndex === -1) {
      draggedPrizeIdRef.current = null;
      setDraggedPrizeId(null);
      return;
    }

    const nextIds = [...withoutDragged];
    nextIds.splice(targetIndex, 0, draggedPrize.id);
    void applyReorder(nextIds, draggedPrize.id);
  };

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
                <PrizeGridItem
                  prize={prize}
                  display={{ showOverlay, showToggle }}
                  reorder={
                    onReorder
                      ? {
                          canDrag: canReorder,
                          isDragging: draggedPrizeId === prize.id,
                        }
                      : null
                  }
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    draggedPrizeIdRef.current = null;
                    setDraggedPrizeId(null);
                  }}
                  onMove={(targetPrize, direction) => void handleMove(targetPrize, direction)}
                  isMoveDisabled={isMoveDisabled}
                  onEditClick={(targetPrize) => {
                    setSelected(targetPrize);
                    setIsEditOpen(true);
                  }}
                  onDeleteClick={(targetPrize) => {
                    setSelected(targetPrize);
                    setIsDeleteOpen(true);
                  }}
                  onToggleChange={handleToggleChange}
                />
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
