"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useRef } from "react";
import { isFileDropItem, type DropEvent } from "react-aria";
import { FileTrigger } from "react-aria-components";
import { IoCloudUploadOutline } from "react-icons/io5";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DropZone } from "@/components/ui/DropZone";
import { Form } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
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
  const [nameJp, setNameJp] = useState(() => initialNameJp || "");
  const [nameEn, setNameEn] = useState(() => initialNameEn || "");
  const newFile = useRef<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(() => initialImageUrl || "");

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== initialImageUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, initialImageUrl]);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      newFile.current = file;
      if (!file) {
        setPreviewUrl(initialImageUrl || "");
      } else {
        setPreviewUrl(URL.createObjectURL(file));
      }
    },
    [initialImageUrl],
  );

  const handleDrop = useCallback(
    async (event: DropEvent) => {
      const item = event.items.find(isFileDropItem);
      if (item) {
        handleFileSelected(await item.getFile());
      }
    },
    [handleFileSelected],
  );

  const handleSubmit = async () => {
    await onSubmit({ nameJp, nameEn, file: newFile.current });
    close();
  };

  return (
    <Modal
      isOpen={isOpened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close();
        }
      }}
      isDismissable={canCloseByClickingBackground}
    >
      <Dialog>
        <h3 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
          景品を編集
        </h3>
        <Separator className="my-4 opacity-75" />
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex flex-col gap-4">
            <TextField label="景品名（日本語）" value={nameJp} onChange={setNameJp} />
            <TextField label="景品名（英語）" value={nameEn} onChange={setNameEn} />
          </div>

          <div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">画像</p>
              {previewUrl ? (
                <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-border bg-card/80 p-2">
                  <Image
                    className="bg-white"
                    src={previewUrl}
                    alt="preview"
                    fill
                    sizes="(max-width: 768px) 72vw, 360px"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-muted-foreground/50 bg-muted/60 text-base text-muted-foreground">
                  (画像なし)
                </div>
              )}

              <DropZone
                onDrop={handleDrop}
                getDropOperation={(types) =>
                  types.has("image/jpeg") || types.has("image/png") || types.has("image/webp")
                    ? "copy"
                    : "cancel"
                }
                className="w-full rounded-2xl"
              >
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
                <Button variant="secondary">画像ファイルを選択</Button>
              </FileTrigger>
              <p className="text-xs text-muted-foreground">
                ファイルを選択しない場合は現在の画像を維持します。
              </p>
            </div>
          </div>
        </Form>
        <div className="flex flex-wrap justify-end gap-2.5 sm:gap-3 mt-5">
          <Button variant="secondary" onPress={close}>
            キャンセル
          </Button>
          <Button variant="primary" onPress={handleSubmit}>
            保存
          </Button>
        </div>
      </Dialog>
    </Modal>
  );
};

export default PrizeEditModal;
