"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";

import {
  AdminButton,
  AdminDropzone,
  AdminInput,
  AdminLabel,
  AdminModalShell,
} from "@/components/admin/ui";

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

  return (
    <AdminModalShell
      isOpen={isOpened}
      onClose={close}
      canCloseByClickingBackground={canCloseByClickingBackground}
      title="景品を編集"
      panelClassName="max-w-2xl"
      footer={
        <>
          <AdminButton variant="secondary" onClick={close}>
            キャンセル
          </AdminButton>
          <AdminButton onClick={handleSubmit}>保存</AdminButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <AdminLabel>日本語名</AdminLabel>
          <AdminInput value={nameJp} onChange={(e) => setNameJp(e.target.value)} />
        </div>

        <div className="space-y-2">
          <AdminLabel>英語名</AdminLabel>
          <AdminInput value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </div>

        <div className="space-y-2">
          <AdminLabel>画像</AdminLabel>
          {previewUrl ? (
            <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface-strong)_86%,transparent)] p-2">
              <Image
                className="rounded-lg"
                src={previewUrl}
                alt="preview"
                fill
                sizes="(max-width: 768px) 72vw, 360px"
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-[var(--admin-border-subtle)] bg-[color-mix(in_srgb,var(--admin-surface-soft)_72%,transparent)] text-base text-[var(--admin-muted-text)]">
              (画像なし)
            </div>
          )}

          <AdminDropzone
            isDragOver={isDragOver}
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
            <div className="flex flex-col items-center gap-2">
              <IoCloudUploadOutline size="3rem" />
              ここに画像をドラッグ&ドロップ
            </div>
          </AdminDropzone>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </AdminModalShell>
  );
};

export default PrizeEditModal;
