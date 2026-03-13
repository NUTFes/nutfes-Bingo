"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { IoClose, IoCreateOutline } from "react-icons/io5";
import { toast } from "react-toastify";

import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import PrizeDeleteModal from "@/components/admin/common/PrizeDeleteModal/PrizeDeleteModal";
import PrizeEditModal from "@/components/admin/common/PrizeEditModal/PrizeEditModal";
import styles from "./PrizeResult.module.css";

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
  const [isImageVisible, setIsImageVisible] = useState(true);

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
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.title}>景品一覧</div>
        <div id="loading" className={isImageVisible ? styles.loading : styles.hidden}></div>
        <div className={styles.grid}>
          {sortedPrizes.map((prize) => (
            <div className={styles.card} key={prize.id} id={`prize-${prize.id}`}>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  aria-label="edit"
                  className={styles.iconBtn}
                  onClick={() => {
                    setSelected(prize);
                    setIsEditOpen(true);
                  }}
                >
                  <IoCreateOutline />
                </button>
                <button
                  type="button"
                  aria-label="delete"
                  className={styles.iconBtn}
                  onClick={() => {
                    setSelected(prize);
                    setIsDeleteOpen(true);
                  }}
                >
                  <IoClose />
                </button>
              </div>
              <div className={styles.image}>
                {prize.image_url ? (
                  <Image
                    src={prize.image_url}
                    alt={prize.name_jp}
                    fill
                    onLoad={() => setIsImageVisible(false)}
                  />
                ) : null}
                {showOverlay && prize.is_won && (
                  <div className={styles.overlay}>
                    <p className={styles.overlayText}>当選済み</p>
                  </div>
                )}
              </div>
              <div className={styles.cardContent}>
                <p>{prize.name_jp}</p>
              </div>
              {showToggle && (
                <div className={styles.toggleContainer}>
                  <div className={styles.toggleButton}>
                    <input
                      id={`toggle-${prize.id}`}
                      className={styles.toggleInput}
                      type="checkbox"
                      checked={prize.is_won}
                      onChange={(event) => void handleToggleChange(prize.id, event.target.checked)}
                    />
                    <label htmlFor={`toggle-${prize.id}`} className={styles.toggleLabel} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
