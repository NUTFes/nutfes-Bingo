"use client";

import Image from "next/image";
import React, { type Key, useMemo, useReducer } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import {
  DropIndicator,
  GridLayout,
  GridList,
  GridListItem,
  Virtualizer,
  useDragAndDrop,
} from "react-aria-components";
import {
  IoChevronDown,
  IoChevronUp,
  IoClose,
  IoCreateOutline,
  IoReorderThreeOutline,
} from "react-icons/io5";

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

const OPTIMISTIC_PRIZE_SORT_ORDER_STEP = 1000;

function toNumericKeys(keys: Set<Key>): number[] {
  const ids: number[] = [];

  for (const key of keys) {
    const id = Number(key);
    if (Number.isFinite(id) && Number.isInteger(id)) {
      ids.push(id);
    }
  }

  return ids;
}

function getReorderedIds(
  currentIds: number[],
  movedIds: number[],
  targetKey: Key,
  dropPosition: "before" | "after",
): number[] | null {
  if (movedIds.length === 0) {
    return null;
  }

  const currentIdSet = new Set(currentIds);
  if (movedIds.some((id) => !currentIdSet.has(id))) {
    return null;
  }

  const targetId = Number(targetKey);
  if (!Number.isFinite(targetId) || !Number.isInteger(targetId) || !currentIdSet.has(targetId)) {
    return null;
  }

  const movedIdSet = new Set(movedIds);
  const remainingIds = currentIds.filter((id) => !movedIdSet.has(id));
  const targetIndex = remainingIds.indexOf(targetId);
  if (targetIndex === -1) {
    return null;
  }

  const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex;
  const nextIds = [
    ...remainingIds.slice(0, insertIndex),
    ...movedIds,
    ...remainingIds.slice(insertIndex),
  ];

  return nextIds.length === currentIds.length &&
    nextIds.every((id, index) => id === currentIds[index])
    ? null
    : nextIds;
}

function applyOptimisticGroupOrder(
  prizes: PrizeWithImageUrl[],
  orderedIds: number[],
): PrizeWithImageUrl[] {
  const sortOrderById = new Map(
    orderedIds.map((id, index) => [id, (index + 1) * OPTIMISTIC_PRIZE_SORT_ORDER_STEP]),
  );

  return prizes.map((prize) => {
    const sortOrder = sortOrderById.get(prize.id);
    return sortOrder === undefined ? prize : { ...prize, sort_order: sortOrder };
  });
}

type MoveDirection = "up" | "down";

interface PrizeGridItemProps {
  prize: PrizeWithImageUrl;
  display: {
    showOverlay: boolean;
    showToggle: boolean;
  };
  onEditClick: (prize: PrizeWithImageUrl) => void;
  onDeleteClick: (prize: PrizeWithImageUrl) => void;
  onToggleChange: (id: number, isWon: boolean) => void;
}

const PrizeGridItem = ({
  prize,
  display,
  onEditClick,
  onDeleteClick,
  onToggleChange,
}: PrizeGridItemProps) => (
  <GridListItem id={prize.id} textValue={prize.name_jp}>
    <div
      className="group relative flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-3 text-foreground transition-colors hover:border-primary/50 sm:p-4"
      id={`prize-${prize.id}`}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <Button
          variant="secondary"
          aria-label={`${prize.name_jp}を編集`}
          className="size-11 p-0"
          onPress={() => onEditClick(prize)}
        >
          <IoCreateOutline className="size-5" />
        </Button>
        <Button
          variant="secondary"
          aria-label={`${prize.name_jp}を削除`}
          className="size-11 p-0"
          onPress={() => onDeleteClick(prize)}
        >
          <IoClose className="size-5" />
        </Button>
      </div>

      <div className="relative aspect-4/3 overflow-hidden rounded-md bg-secondary/30">
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
          <div className="absolute inset-0 flex bg-background/50 p-2">
            <span className="inline-flex h-fit items-center rounded bg-foreground px-2 py-1 text-xs font-medium text-background">
              当選済み
            </span>
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
              <span className="text-sm text-foreground">
                {prize.is_won ? "当選済み" : "未当選"}
              </span>
            </Switch>
          </div>
        </div>
      )}
    </div>
  </GridListItem>
);

interface PrizeReorderGroup {
  key: "unwon" | "won";
  title: string;
  description: string;
  prizes: PrizeWithImageUrl[];
}

interface PrizeReorderSectionProps {
  group: PrizeReorderGroup;
  canDrag: boolean;
  movingId: number | null;
  onReorderGroup: (orderedIds: number[], movedId: number) => void;
  onMove: (prize: PrizeWithImageUrl, direction: MoveDirection) => void;
  isMoveDisabled: (prize: PrizeWithImageUrl, direction: MoveDirection) => boolean;
  shouldReduceMotion: boolean;
}

const PrizeReorderSection = ({
  group,
  canDrag,
  movingId,
  onReorderGroup,
  onMove,
  isMoveDisabled,
  shouldReduceMotion,
}: PrizeReorderSectionProps) => {
  const groupIds = useMemo(() => group.prizes.map((prize) => prize.id), [group.prizes]);
  const { dragAndDropHooks } = useDragAndDrop<PrizeWithImageUrl>({
    isDisabled: !canDrag,
    getItems(_keys, items) {
      return items.map((item) => ({
        "text/plain": item.name_jp,
        "application/x-nutfes-bingo-prize-id": String(item.id),
      }));
    },
    onReorder(event) {
      if (event.target.dropPosition !== "before" && event.target.dropPosition !== "after") {
        return;
      }

      const movedIds = toNumericKeys(event.keys);
      const movedId = movedIds[0];
      if (movedId === undefined) {
        return;
      }

      const nextIds = getReorderedIds(
        groupIds,
        movedIds,
        event.target.key,
        event.target.dropPosition,
      );
      if (!nextIds) {
        return;
      }

      onReorderGroup(nextIds, movedId);
    },
    renderDropIndicator(target) {
      return (
        <DropIndicator
          target={target}
          className="mx-2 my-1 h-1 rounded-full bg-transparent outline-none data-[drop-target]:bg-primary"
        />
      );
    },
  });

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{group.title}</h3>
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {group.prizes.length} 件
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{group.description}</p>
      </div>

      {group.prizes.length > 0 ? (
        <GridList
          aria-label={`${group.title}の並び替え`}
          items={group.prizes}
          dragAndDropHooks={dragAndDropHooks}
          className="space-y-2 outline-none"
        >
          {(prize) => (
            <PrizeReorderRow
              prize={prize}
              movingId={movingId}
              onMove={onMove}
              isMoveDisabled={isMoveDisabled}
              shouldReduceMotion={shouldReduceMotion}
            />
          )}
        </GridList>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-card/30 py-8">
          <p className="text-sm text-muted-foreground">該当する景品はありません。</p>
        </div>
      )}
    </section>
  );
};

interface PrizeReorderRowProps {
  prize: PrizeWithImageUrl;
  movingId: number | null;
  onMove: (prize: PrizeWithImageUrl, direction: MoveDirection) => void;
  isMoveDisabled: (prize: PrizeWithImageUrl, direction: MoveDirection) => boolean;
  shouldReduceMotion: boolean;
}

const PrizeReorderRow = ({
  prize,
  movingId,
  onMove,
  isMoveDisabled,
  shouldReduceMotion,
}: PrizeReorderRowProps) => {
  const isBusy = movingId === prize.id;

  return (
    <GridListItem id={prize.id} textValue={prize.name_jp} className="outline-none">
      {({ allowsDragging }) => (
        <m.div
          layout="position"
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 40,
            duration: shouldReduceMotion ? 0 : undefined,
          }}
          className={`group flex items-center gap-3 rounded-md border border-border bg-card p-2 text-foreground transition-colors sm:gap-4 sm:p-3 ${
            isBusy
              ? "scale-[0.98] opacity-50 ring-2 ring-primary ring-offset-2 ring-offset-background"
              : "hover:border-primary/30 hover:bg-muted/30"
          }`}
          aria-busy={isBusy}
        >
          <Button
            slot="drag"
            variant="quiet"
            aria-label={`${prize.name_jp}をドラッグして並び替え`}
            isDisabled={!allowsDragging || isBusy}
            className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              allowsDragging
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            <IoReorderThreeOutline className="size-5" aria-hidden />
          </Button>

          <div className="relative size-12 shrink-0 overflow-hidden rounded border border-border/50 bg-secondary/30 sm:size-14">
            {prize.image_url ? (
              <Image
                src={prize.image_url}
                alt={prize.name_jp}
                fill
                sizes="56px"
                className="bg-white object-contain p-1"
                draggable={false}
              />
            ) : (
              <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                画像なし
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground sm:text-base">
              {prize.name_jp}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1">
            <Button
              variant="secondary"
              aria-label={`${prize.name_jp}を上へ移動`}
              isDisabled={isMoveDisabled(prize, "up")}
              onPress={() => onMove(prize, "up")}
              className="size-9 p-0 sm:size-10"
            >
              <IoChevronUp className="size-4" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              aria-label={`${prize.name_jp}を下へ移動`}
              isDisabled={isMoveDisabled(prize, "down")}
              onPress={() => onMove(prize, "down")}
              className="size-9 p-0 sm:size-10"
            >
              <IoChevronDown className="size-4" aria-hidden />
            </Button>
          </div>
        </m.div>
      )}
    </GridListItem>
  );
};

interface PrizeUiState {
  isDeleteOpen: boolean;
  isEditOpen: boolean;
  selected: PrizeWithImageUrl | null;
  movingId: number | null;
}

type PrizeUiAction =
  | { type: "openDelete"; prize: PrizeWithImageUrl }
  | { type: "openEdit"; prize: PrizeWithImageUrl }
  | { type: "setDeleteOpen"; isOpen: boolean }
  | { type: "setEditOpen"; isOpen: boolean }
  | { type: "startMove"; id: number }
  | { type: "finishMove" };

const INITIAL_PRIZE_UI_STATE: PrizeUiState = {
  isDeleteOpen: false,
  isEditOpen: false,
  selected: null,
  movingId: null,
};

function prizeUiReducer(state: PrizeUiState, action: PrizeUiAction): PrizeUiState {
  switch (action.type) {
    case "openDelete":
      return { ...state, isDeleteOpen: true, selected: action.prize };
    case "openEdit":
      return { ...state, isEditOpen: true, selected: action.prize };
    case "setDeleteOpen":
      return {
        ...state,
        isDeleteOpen: action.isOpen,
        selected: action.isOpen ? state.selected : null,
      };
    case "setEditOpen":
      return {
        ...state,
        isEditOpen: action.isOpen,
        selected: action.isOpen ? state.selected : null,
      };
    case "startMove":
      return { ...state, movingId: action.id };
    case "finishMove":
      return { ...state, movingId: null };
  }
}

function usePrizeResultController({
  prizeResult,
  setBingoPrize,
  canReorder = false,
  onToggle,
  onReorder,
  onDelete,
  onUpdate,
}: PrizeResultProps) {
  const [state, dispatch] = useReducer(prizeUiReducer, INITIAL_PRIZE_UI_STATE);

  const sortedPrizes = useMemo(() => prizeResult.toSorted(comparePrizeOrder), [prizeResult]);

  const { unwonPrizes, wonPrizes, unwonPrizeIds, wonPrizeIds } = useMemo(() => {
    const unwon: PrizeWithImageUrl[] = [];
    const won: PrizeWithImageUrl[] = [];
    const unwonIds: number[] = [];
    const wonIds: number[] = [];

    for (const prize of sortedPrizes) {
      if (prize.is_won) {
        won.push(prize);
        wonIds.push(prize.id);
      } else {
        unwon.push(prize);
        unwonIds.push(prize.id);
      }
    }

    return {
      unwonPrizes: unwon,
      wonPrizes: won,
      unwonPrizeIds: unwonIds,
      wonPrizeIds: wonIds,
    };
  }, [sortedPrizes]);

  const prizeGroups = useMemo<PrizeReorderGroup[]>(
    () => [
      {
        key: "unwon",
        title: "未当選",
        description: "公開ページで先に表示",
        prizes: unwonPrizes,
      },
      {
        key: "won",
        title: "当選済み",
        description: "公開ページで後に表示",
        prizes: wonPrizes,
      },
    ],
    [unwonPrizes, wonPrizes],
  );

  const prizePositions = useMemo(() => {
    const positions = new Map<number, { ids: number[]; index: number }>();
    [unwonPrizeIds, wonPrizeIds].forEach((ids) => {
      ids.forEach((id, index) => {
        positions.set(id, { ids, index });
      });
    });
    return positions;
  }, [unwonPrizeIds, wonPrizeIds]);

  const isReordering = canReorder && Boolean(onReorder);

  const applyReorder = async (orderedIds: number[], movedId: number) => {
    if (!onReorder) {
      return;
    }

    let rollbackPrizes: PrizeWithImageUrl[] | null = null;

    try {
      dispatch({ type: "startMove", id: movedId });
      setBingoPrize((prev) => {
        rollbackPrizes = prev;
        return applyOptimisticGroupOrder(prev, orderedIds);
      });

      const reordered = await onReorder(orderedIds);
      setBingoPrize(reordered);
      showToast({ title: "順番を保存しました" });
    } catch (error) {
      console.error(error);
      if (rollbackPrizes) {
        setBingoPrize(rollbackPrizes);
      }
      showToast({
        title: "並び替え失敗",
        description: "元の順番に戻しました。再度お試しください。",
      });
    } finally {
      dispatch({ type: "finishMove" });
    }
  };

  const handleMove = async (prize: PrizeWithImageUrl, direction: MoveDirection) => {
    if (!isReordering || state.movingId !== null) {
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

  const isMoveDisabled = (prize: PrizeWithImageUrl, direction: MoveDirection) => {
    const position = prizePositions.get(prize.id);
    if (!isReordering || state.movingId !== null || !position) {
      return true;
    }
    return direction === "up" ? position.index === 0 : position.index === position.ids.length - 1;
  };

  const handleReorderGroup = async (orderedIds: number[], movedId: number) => {
    if (!isReordering || state.movingId !== null) {
      return;
    }

    await applyReorder(orderedIds, movedId);
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
    if (!state.selected) {
      return;
    }

    try {
      await onDelete(state.selected);
      setBingoPrize((prev) => prev.filter((prize) => prize.id !== state.selected?.id));
      showToast({ title: "削除完了", description: "景品を削除しました。" });
    } catch (error) {
      console.error(error);
      showToast({ title: "削除失敗", description: "景品の削除に失敗しました。" });
    } finally {
      dispatch({ type: "setDeleteOpen", isOpen: false });
    }
  };

  const submitEdit = async (params: { nameJp: string; nameEn: string; file?: File | null }) => {
    if (!state.selected) {
      return;
    }

    try {
      const updated = await onUpdate({ id: state.selected.id, ...params });
      setBingoPrize((prev) =>
        prev.map((prize) => (prize.id === state.selected?.id ? updated : prize)),
      );
      showToast({ title: "更新完了", description: "景品を更新しました。" });
    } catch (error) {
      console.error(error);
      showToast({ title: "更新失敗", description: "景品の更新に失敗しました。" });
    } finally {
      dispatch({ type: "setEditOpen", isOpen: false });
    }
  };

  return {
    ...state,
    sortedPrizes,
    prizeGroups,
    isReordering,
    handleReorderGroup,
    handleMove,
    isMoveDisabled,
    handleToggleChange,
    confirmDelete,
    submitEdit,
    openEdit: (prize: PrizeWithImageUrl) => dispatch({ type: "openEdit", prize }),
    openDelete: (prize: PrizeWithImageUrl) => dispatch({ type: "openDelete", prize }),
    setDeleteOpen: (isOpen: boolean) => dispatch({ type: "setDeleteOpen", isOpen }),
    setEditOpen: (isOpen: boolean) => dispatch({ type: "setEditOpen", isOpen }),
  };
}
const PrizeResult = (props: PrizeResultProps) => {
  const { showOverlay, showToggle } = props;
  const {
    sortedPrizes,
    prizeGroups,
    isReordering,
    isDeleteOpen,
    isEditOpen,
    selected,
    movingId,
    handleReorderGroup,
    handleMove,
    isMoveDisabled,
    handleToggleChange,
    confirmDelete,
    submitEdit,
    openEdit,
    openDelete,
    setDeleteOpen,
    setEditOpen,
  } = usePrizeResultController(props);

  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <div className="flex flex-col gap-4">
        {isReordering ? (
          <LazyMotion features={domAnimation}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-10">
              {prizeGroups.map((group) => (
                <PrizeReorderSection
                  key={group.key}
                  group={group}
                  canDrag={movingId === null}
                  movingId={movingId}
                  onReorderGroup={(orderedIds, movedId) =>
                    void handleReorderGroup(orderedIds, movedId)
                  }
                  onMove={(targetPrize, direction) => void handleMove(targetPrize, direction)}
                  isMoveDisabled={isMoveDisabled}
                  shouldReduceMotion={Boolean(shouldReduceMotion)}
                />
              ))}
            </div>
          </LazyMotion>
        ) : (
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
                    onEditClick={openEdit}
                    onDeleteClick={openDelete}
                    onToggleChange={handleToggleChange}
                  />
                )}
              </GridList>
            </Virtualizer>
          </div>
        )}
      </div>

      <PrizeDeleteModal
        isOpened={isDeleteOpen}
        setIsOpened={setDeleteOpen}
        prizeName={selected?.name_jp}
        onConfirm={confirmDelete}
      />
      {selected && isEditOpen && (
        <PrizeEditModal
          key={selected.id}
          isOpened={isEditOpen}
          setIsOpened={setEditOpen}
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
