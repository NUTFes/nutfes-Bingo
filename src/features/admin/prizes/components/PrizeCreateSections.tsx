import { CloudUpload } from "lucide-react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import type { DropEvent } from "react-aria";
import { FileTrigger } from "react-aria-components";

import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { Form } from "@/components/ui/Form";
import { Separator } from "@/components/ui/Separator";
import { TextField } from "@/components/ui/TextField";
import { PRIZE_IMAGE_MIME_TYPES } from "@shared/bingo-constraints";

interface PrizeCreateFormSectionProps {
  prizeNameJp: string;
  prizeNameEn: string;
  onDrop: (event: DropEvent) => Promise<void>;
  onFileSelected: (file: File | null) => void;
  onNameJpChange: (value: string) => void;
  onNameEnChange: (value: string) => void;
  onSubmit: () => void;
}

export function PrizeCreateFormSection({
  prizeNameJp,
  prizeNameEn,
  onDrop,
  onFileSelected,
  onNameJpChange,
  onNameEnChange,
  onSubmit,
}: PrizeCreateFormSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
        <div className="max-w-3xl space-y-1">
          <h2 className="text-lg font-semibold text-foreground">景品情報を入力</h2>
          <p className="text-sm text-muted-foreground">
            画像・景品名を入力して新しい景品を登録します。
          </p>
        </div>
      </header>
      <Separator className="mb-4 opacity-70" />
      <div className="space-y-5">
        <DropZone
          onDrop={onDrop}
          getDropOperation={(types) =>
            PRIZE_IMAGE_MIME_TYPES.some((type) => types.has(type)) ? "copy" : "cancel"
          }
          className="w-full rounded-2xl"
        >
          <div className="flex flex-col items-center gap-2">
            <CloudUpload className="size-16" />
            <p>ここに画像をドラッグ&ドロップ</p>
            <p className="text-sm font-normal text-muted-foreground">または下のボタンから選択</p>
          </div>
        </DropZone>
        <FileTrigger
          acceptedFileTypes={[...PRIZE_IMAGE_MIME_TYPES]}
          onSelect={(files) => {
            const file = files ? Array.from(files)[0] : null;
            onFileSelected(file ?? null);
          }}
        >
          <Button variant="secondary">ファイルを選択</Button>
        </FileTrigger>
        <p className="text-sm text-muted-foreground">JPEG / PNG / WebP、5 MiB以下</p>

        <Form
          className="gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex flex-col gap-4">
            <TextField
              label="景品名（日本語）"
              name="nameJp"
              value={prizeNameJp}
              onChange={onNameJpChange}
            />
            <TextField
              label="景品名（英語）"
              name="nameEn"
              value={prizeNameEn}
              onChange={onNameEnChange}
            />
          </div>
        </Form>
      </div>
    </section>
  );
}

interface PrizeCreatePreviewSectionProps {
  previewUrl: string;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function PrizeCreatePreviewSection({
  previewUrl,
  isSubmitting,
  onSubmit,
}: PrizeCreatePreviewSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
        <div className="max-w-3xl space-y-1">
          <h2 className="text-lg font-semibold text-foreground">景品プレビュー</h2>
          <p className="text-sm text-muted-foreground">登録前に画像と景品名を確認できます。</p>
        </div>
      </header>
      <Separator className="mb-4 opacity-70" />
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-4">
          {previewUrl ? (
            <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-muted/70">
              <ResponsiveImage
                src={previewUrl}
                alt="preview"
                fill
                sizes="(max-width: 768px) 72vw, 360px"
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div className="grid aspect-square w-full max-w-sm place-items-center rounded-2xl border border-dashed border-muted-foreground/50 text-sm text-muted-foreground sm:text-base">
              画像を選択してください
            </div>
          )}
          <Button isDisabled={isSubmitting} className="h-12 w-full max-w-sm" onPress={onSubmit}>
            {isSubmitting ? "登録中..." : "景品を登録"}
          </Button>
        </div>
      </div>
    </section>
  );
}
