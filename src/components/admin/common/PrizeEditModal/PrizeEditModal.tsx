"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";
import { RxCrossCircled } from "react-icons/rx";

import styles from "./PrizeEditModal.module.css";

interface Props {
  isOpened: boolean;
  setIsOpened: (v: boolean) => void;
  canCloseByClickingBackground?: boolean;
  id: number;
  initialNameJp?: string | null;
  initialNameEn?: string | null;
  initialImageUrl?: string | null;
  onSubmit: (params: {
    nameJp: string;
    nameEn: string;
    file?: File | null;
  }) => Promise<void> | void;
}

const PrizeEditModal = ({
  isOpened,
  setIsOpened,
  canCloseByClickingBackground = true,
  initialNameJp = "",
  initialNameEn = "",
  initialImageUrl = null,
  onSubmit,
}: Props) => {
  const close = () => setIsOpened(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameJp, setNameJp] = useState(initialNameJp || "");
  const [nameEn, setNameEn] = useState(initialNameEn || "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialImageUrl || "");
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (isOpened) {
      setNameJp(initialNameJp || "");
      setNameEn(initialNameEn || "");
      setNewFile(null);
      setPreviewUrl(initialImageUrl || "");
    }
  }, [initialImageUrl, initialNameEn, initialNameJp, isOpened]);

  useEffect(() => {
    if (!newFile) {
      return undefined;
    }

    const url = URL.createObjectURL(newFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [newFile]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const targetFile = event.target.files?.[0];
    if (!targetFile) {
      setNewFile(null);
      return;
    }
    setNewFile(targetFile);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    setNewFile(file);
  }, []);

  const handleSubmit = async () => {
    await onSubmit({ nameJp, nameEn, file: newFile });
    close();
  };

  if (!isOpened) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <button type="button" className={styles.btnClose} onClick={close}>
          <RxCrossCircled />
        </button>
        <div className={styles.title}>景品を編集</div>
        <div className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label}>日本語名</label>
            <input
              className={styles.input}
              value={nameJp}
              onChange={(e) => setNameJp(e.target.value)}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>英語名</label>
            <input
              className={styles.input}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>画像</label>
            {previewUrl ? (
              <div className={styles.previewContainer}>
                <Image
                  className={styles.previewImage}
                  src={previewUrl}
                  alt="preview"
                  fill
                  sizes="(max-width: 768px) 72vw, 360px"
                  style={{ objectFit: "contain" }}
                />
              </div>
            ) : (
              <div className={styles.imagePreview}>(画像なし)</div>
            )}
            <div
              className={isDragOver ? styles.drop_area_drag_over : styles.drop_area}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.input_center_item}>
                <IoCloudUploadOutline size="3rem" />
                ここに画像をドラッグ&ドロップ
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={close}>
              キャンセル
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={handleSubmit}
            >
              保存
            </button>
          </div>
        </div>
      </div>
      {canCloseByClickingBackground && <div className={styles.background} onClick={close} />}
    </div>
  );
};

export default PrizeEditModal;
