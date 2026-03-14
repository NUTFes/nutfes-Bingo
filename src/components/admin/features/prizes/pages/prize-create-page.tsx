"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { isFileDropItem, type DropEvent } from "react-aria";
import { FileTrigger } from "react-aria-components";
import { IoCloudUploadOutline } from "react-icons/io5";

import { createPrize, deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import Header from "@/components/admin/common/Header/Header";
import PrizeResult from "@/components/admin/common/PrizeResult/PrizeResult";
import { AdminPageContent, AdminPageShell } from "@/components/admin/ui/layout";
import { AdminPanel } from "@/components/admin/ui/panel";
import { Breadcrumb, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/ui/DropZone";
import { Form } from "@/components/ui/Form";
import { TextField } from "@/components/ui/TextField";
import { MyToastRegion, queue } from "@/components/ui/Toast";

interface PrizeCreatePageProps {
  initialPrizes: PrizeWithImageUrl[];
}

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export function PrizeCreatePage({ initialPrizes }: PrizeCreatePageProps) {
  const router = useRouter();
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
    <AdminPageShell>
      <MyToastRegion />
      <Header user="Admin">
        <Button onPress={() => router.push("/admin")}>戻る</Button>
      </Header>

      <AdminPageContent className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="xl:col-span-2">
          <Breadcrumbs>
            <Breadcrumb href="/admin">Dashboard</Breadcrumb>
            <Breadcrumb href="/admin/prizes">Prizes</Breadcrumb>
            <Breadcrumb href="/admin/prizes/new">New Prize</Breadcrumb>
          </Breadcrumbs>
        </div>
        <AdminPanel
          title="登録する画像を選択"
          description="画像を選び、景品名を入力して登録します。"
          contentClassName="space-y-5"
        >
          <DropZone onDrop={handleDrop} className="w-full py-10">
            <div className="flex flex-col items-center gap-2">
              <IoCloudUploadOutline size="4rem" />
              <p>ここに画像をドラッグ&ドロップ</p>
              <p className="text-sm font-normal text-[var(--admin-muted-text)]">
                または下のボタンから選択
              </p>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="景品名を入力"
                name="nameJp"
                value={prizeNameJp}
                onChange={setPrizeNameJp}
              />
              <TextField
                label="英語名を入力"
                name="nameEn"
                value={prizeNameEn}
                onChange={setPrizeNameEn}
              />
            </div>
          </Form>
        </AdminPanel>

        <AdminPanel
          title="景品プレビュー"
          description="選択中の画像と登録内容を確認できます。"
          contentClassName="space-y-5"
        >
          <div className="flex flex-col items-center gap-4">
            {previewUrl ? (
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--admin-surface-soft)]">
                <Image
                  src={previewUrl}
                  alt="preview"
                  fill
                  sizes="(max-width: 768px) 72vw, 360px"
                  style={{ objectFit: "contain" }}
                />
              </div>
            ) : (
              <div className="grid aspect-square w-full max-w-sm place-items-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--admin-border)_70%,transparent)] text-sm text-[var(--admin-muted-text)] sm:text-base">
                画像を選択してください
              </div>
            )}
            <Button
              isDisabled={isSubmitting}
              className="h-12 w-full max-w-sm"
              onPress={() => void submit()}
            >
              {isSubmitting ? "登録中..." : "送信"}
            </Button>
          </div>
        </AdminPanel>
      </AdminPageContent>

      <AdminPageContent className="mt-6">
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
      </AdminPageContent>
    </AdminPageShell>
  );
}
