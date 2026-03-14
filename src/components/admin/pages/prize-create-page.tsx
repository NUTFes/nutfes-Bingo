"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoCloudUploadOutline } from "react-icons/io5";
import { ToastContainer, toast } from "react-toastify";

import { createPrize, deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Header, PrizeResult } from "@/components/admin/common";
import {
  AdminButton,
  AdminDropzone,
  AdminInput,
  AdminLabel,
  AdminPageContent,
  AdminPageShell,
  AdminPanel,
} from "@/components/admin/ui";

interface PrizeCreatePageProps {
  initialPrizes: PrizeWithImageUrl[];
}

export function PrizeCreatePage({ initialPrizes }: PrizeCreatePageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bingoPrize, setBingoPrize] = useState<PrizeWithImageUrl[]>(initialPrizes);
  const [prizeNameJp, setPrizeNameJp] = useState("");
  const [prizeNameEn, setPrizeNameEn] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const targetFile = event.target.files?.[0];
    if (!targetFile) {
      setImageFile(null);
      setPreviewUrl("");
      return;
    }
    setImageFile(targetFile);
    setPreviewUrl(URL.createObjectURL(targetFile));
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const submit = async () => {
    if (!prizeNameJp) {
      toast.error("景品名を入力してください。");
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("景品を登録しました");
    } catch (error) {
      console.error(error);
      toast.error("景品の登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPageShell>
      <ToastContainer position="top-center" />
      <Header user="Admin">
        <AdminButton rounded="pill" onClick={() => router.push("/admin")}>
          戻る
        </AdminButton>
      </Header>

      <AdminPageContent className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminPanel title="登録する画像を選択" description="画像を選び、景品名を入力して登録します。">
          <div className="space-y-4">
            <AdminDropzone
              isDragOver={isDragOver}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="py-10"
            >
              <div className="flex flex-col items-center gap-2">
                <IoCloudUploadOutline size="4rem" />
                ここに画像をドラッグ&ドロップ
              </div>
            </AdminDropzone>
            <input
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-2">
              <AdminLabel>景品名を入力</AdminLabel>
              <AdminInput
                value={prizeNameJp}
                type="text"
                name="nameJp"
                onChange={(event) => setPrizeNameJp(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <AdminLabel>英語名を入力</AdminLabel>
              <AdminInput
                value={prizeNameEn}
                type="text"
                name="nameEn"
                onChange={(event) => setPrizeNameEn(event.target.value)}
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="景品プレビュー" description="選択中の画像と登録内容を確認できます。">
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
              <div className="grid aspect-square w-full max-w-sm place-items-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--admin-border)_70%,transparent)] text-[var(--admin-muted-text)]">
                画像を選択してください
              </div>
            )}
            <AdminButton
              size="lg"
              className="w-full max-w-sm"
              onClick={() => void submit()}
              disabled={isSubmitting}
            >
              送信
            </AdminButton>
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
