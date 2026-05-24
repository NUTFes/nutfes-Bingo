"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { isFileDropItem, type DropEvent } from "react-aria";
import { FileTrigger } from "react-aria-components";
import { IoCloudUploadOutline } from "react-icons/io5";

import { AdminHeader } from "@/components/admin";
import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { usePrizesPolling } from "@/lib/polling";
import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { Form } from "@/components/ui/Form";
import { Separator } from "@/components/ui/Separator";
import { TextField } from "@/components/ui/TextField";
import { MyToastRegion } from "@/components/ui/Toast";
import { queue } from "@/components/ui/toastQueue";
import PrizeResult from "./components/PrizeResult";
import { prizeActions } from "./actions-client";

interface AdminPrizeCreatePageProps {
  initialPrizes: PrizeWithImageUrl[];
}

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export function AdminPrizeCreatePage({ initialPrizes }: AdminPrizeCreatePageProps) {
  const [bingoPrize, setBingoPrize] = usePrizesPolling(initialPrizes);
  const [formState, setFormState] = useState({
    prizeNameJp: "",
    prizeNameEn: "",
    imageFile: null as File | null,
    previewUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { prizeNameJp, prizeNameEn, imageFile, previewUrl } = formState;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelected = useCallback((targetFile: File | null) => {
    if (!targetFile) {
      setFormState((prev) => ({
        ...prev,
        imageFile: null,
        previewUrl: "",
      }));
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(targetFile);
    setFormState((prev) => ({
      ...prev,
      imageFile: targetFile,
      previewUrl: nextPreviewUrl,
    }));
  }, []);

  const handleDrop = useCallback(
    async (event: DropEvent) => {
      const item = event.items.find(isFileDropItem);
      if (item) {
        handleFileSelected(await item.getFile());
      }
    },
    [handleFileSelected],
  );

  const submit = async () => {
    if (!prizeNameJp) {
      showToast({ title: "入力不足", description: "景品名を入力してください。" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("nameJp", prizeNameJp);
      formData.set("nameEn", prizeNameEn);
      if (imageFile) {
        formData.set("file", imageFile);
      }
      const result = await prizeActions.createPrize(formData);
      if (!result.ok) {
        console.error(result.error);
        showToast({ title: "登録失敗", description: "景品の登録に失敗しました。" });
        return;
      }
      const prize = result.data;
      setBingoPrize((prev) => [...prev, prize]);
      setFormState({
        prizeNameJp: "",
        prizeNameEn: "",
        imageFile: null,
        previewUrl: "",
      });
      showToast({ title: "登録完了", description: "景品を登録しました。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 text-foreground sm:pb-10">
      <MyToastRegion />
      <AdminHeader />

      <div className="mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-5 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                景品情報を入力
              </h2>
              <p className="text-sm text-muted-foreground">
                画像・景品名を入力して新しい景品を登録します。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-5">
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
                <IoCloudUploadOutline size="4rem" />
                <p>ここに画像をドラッグ&ドロップ</p>
                <p className="text-sm font-normal text-muted-foreground">または下のボタンから選択</p>
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

            <Form
              className="gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="flex flex-col gap-4">
                <TextField
                  label="景品名（日本語）"
                  name="nameJp"
                  value={prizeNameJp}
                  onChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      prizeNameJp: value,
                    }))
                  }
                />
                <TextField
                  label="景品名（英語）"
                  name="nameEn"
                  value={prizeNameEn}
                  onChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      prizeNameEn: value,
                    }))
                  }
                />
              </div>
            </Form>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                景品プレビュー
              </h2>
              <p className="text-sm text-muted-foreground">
                登録前に画像と景品名を確認できます。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4">
              {previewUrl ? (
                <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-muted/70">
                  <Image
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
              <Button
                isDisabled={isSubmitting}
                className="h-12 w-full max-w-sm"
                onPress={() => void submit()}
              >
                {isSubmitting ? "登録中..." : "景品を登録"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <PrizeResult
          prizeResult={bingoPrize}
          setBingoPrize={setBingoPrize}
          showToggle={false}
          showOverlay={false}
          onToggle={async (id, isWon) => {
            const result = await prizeActions.togglePrizeWon(id, isWon);
            if (!result.ok) {
              throw new Error(result.error);
            }
            return result.data;
          }}
          onDelete={async (prize) => {
            const result = await prizeActions.deletePrize(prize.id);
            if (!result.ok) {
              throw new Error(result.error);
            }
          }}
          onUpdate={async ({ id, nameJp, nameEn, file }) => {
            const formData = new FormData();
            formData.set("id", String(id));
            formData.set("nameJp", nameJp);
            formData.set("nameEn", nameEn);
            if (file) {
              formData.set("file", file);
            }
            const result = await prizeActions.updatePrize(formData);
            if (!result.ok) {
              throw new Error(result.error);
            }
            return result.data;
          }}
        />
      </div>
    </div>
  );
}
