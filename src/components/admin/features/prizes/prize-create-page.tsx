"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { isFileDropItem, type DropEvent } from "react-aria";
import { FileTrigger } from "react-aria-components";
import { IoCloudUploadOutline } from "react-icons/io5";

import { createPrize, deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import Header from "@/components/admin/common/Header";
import PrizeResult from "@/components/admin/common/PrizeResult";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { Form } from "@/components/ui/Form";
import { Separator } from "@/components/ui/Separator";
import { TextField } from "@/components/ui/TextField";
import { MyToastRegion, queue } from "@/components/ui/Toast";

interface AdminPrizeCreatePageProps {
  initialPrizes: PrizeWithImageUrl[];
}

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export function AdminPrizeCreatePage({ initialPrizes }: AdminPrizeCreatePageProps) {
  const [bingoPrize, setBingoPrize] = useState<PrizeWithImageUrl[]>(initialPrizes);
  const [prizeNameJp, setPrizeNameJp] = useState("");
  const [prizeNameEn, setPrizeNameEn] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelected = useCallback((targetFile: File | null) => {
    if (!targetFile) {
      setImageFile(null);
      setPreviewUrl("");
      return;
    }
    setImageFile(targetFile);
    setPreviewUrl(URL.createObjectURL(targetFile));
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
      const prize = await createPrize(formData);
      setBingoPrize((prev) => [...prev, prize]);
      setPrizeNameJp("");
      setPrizeNameEn("");
      setImageFile(null);
      setPreviewUrl("");
      showToast({ title: "登録完了", description: "景品を登録しました。" });
    } catch (error) {
      console.error(error);
      showToast({ title: "登録失敗", description: "景品の登録に失敗しました。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black pb-8 text-zinc-100 sm:pb-10">
      <MyToastRegion />
      <Header user="Admin" />

      <div className="mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-5 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
                景品情報を入力
              </h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                画像・景品名を入力して新しい景品を登録します。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-5">
            <DropZone onDrop={handleDrop} className="w-full rounded-2xl py-10">
              <div className="flex flex-col items-center gap-2">
                <IoCloudUploadOutline size="4rem" />
                <p>ここに画像をドラッグ&ドロップ</p>
                <p className="text-sm font-normal text-zinc-400">または下のボタンから選択</p>
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
                  onChange={setPrizeNameJp}
                />
                <TextField
                  label="景品名（英語）"
                  name="nameEn"
                  value={prizeNameEn}
                  onChange={setPrizeNameEn}
                />
              </div>
            </Form>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
                景品プレビュー
              </h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                登録前に画像と景品名を確認できます。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4">
              {previewUrl ? (
                <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-zinc-800/70">
                  <Image
                    src={previewUrl}
                    alt="preview"
                    fill
                    sizes="(max-width: 768px) 72vw, 360px"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div className="grid aspect-square w-full max-w-sm place-items-center rounded-2xl border border-dashed border-zinc-600 text-sm text-zinc-400 sm:text-base">
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
            return togglePrizeWon(id, isWon);
          }}
          onDelete={async (prize) => {
            await deletePrize(prize.id);
          }}
          onUpdate={async ({ id, nameJp, nameEn, file }) => {
            const formData = new FormData();
            formData.set("id", String(id));
            formData.set("nameJp", nameJp);
            formData.set("nameEn", nameEn);
            if (file) {
              formData.set("file", file);
            }
            return updatePrize(formData);
          }}
        />
      </div>
    </div>
  );
}
