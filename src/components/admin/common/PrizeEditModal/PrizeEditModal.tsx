"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { isFileDropItem, type DropEvent } from "react-aria";
import { FileTrigger } from "react-aria-components";
import { IoCloudUploadOutline } from "react-icons/io5";

import { AdminModalShell } from "@/components/admin/ui/modal-shell";
import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { Form } from "@/components/ui/Form";
import { Separator } from "@/components/ui/Separator";
import { TextField } from "@/components/ui/TextField";

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
  const [nameJp, setNameJp] = useState(initialNameJp || "");
  const [nameEn, setNameEn] = useState(initialNameEn || "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialImageUrl || "");

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

  const handleFileSelected = useCallback((file: File | null) => {
    setNewFile(file);
  }, []);

  const handleDrop = useCallback(
    async (event: DropEvent) => {
      for (const item of event.items) {
        if (isFileDropItem(item)) {
          handleFileSelected(await item.getFile());
          return;
        }
      }
    },
    [handleFileSelected],
  );

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
          <Button variant="secondary" onPress={close}>
            キャンセル
          </Button>
          <Button variant="primary" onPress={handleSubmit}>
            保存
          </Button>
        </>
      }
    >
      <Form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <TextField label="日本語名" value={nameJp} onChange={setNameJp} />
        <TextField label="英語名" value={nameEn} onChange={setNameEn} />

        <Separator />

        <div className="space-y-2">
          <p className="m-0 text-sm font-medium text-[var(--admin-text)]">画像</p>
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

          <DropZone onDrop={handleDrop} className="w-full">
            <div className="flex flex-col items-center gap-2">
              <IoCloudUploadOutline size="3rem" />
              ここに画像をドラッグ&ドロップ
            </div>
          </DropZone>

          <FileTrigger
            acceptedFileTypes={["image/*"]}
            onSelect={(files) => {
              const file = files ? Array.from(files)[0] : null;
              handleFileSelected(file ?? null);
            }}
          >
            <Button variant="secondary">ファイルを選択</Button>
          </FileTrigger>
        </div>
      </Form>
    </AdminModalShell>
  );
};

export default PrizeEditModal;
