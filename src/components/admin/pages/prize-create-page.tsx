"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoCloudUploadOutline } from "react-icons/io5";
import { ToastContainer, toast } from "react-toastify";

import { createPrize, deletePrize, togglePrizeWon, updatePrize } from "@/app/admin/actions";
import type { PrizeWithImageUrl } from "@/lib/bingo/types";
import { Header, PrizeResult } from "@/components/admin/common";
import styles from "@/styles/admin/postPrizes.module.css";

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
    <div className={styles.container}>
      <ToastContainer position="top-center" />
      <div>
        <Header user="Admin">
          <button type="button" onClick={() => router.push("/admin")} className={styles.backButton}>
            戻る
          </button>
        </Header>
        <div className={styles.input_group}>
          <div className={styles.input_group_content}>
            <div>
              <h2>登録する画像を選択</h2>
              <div
                className={isDragOver ? styles.drop_area_drag_over : styles.drop_area}
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
              >
                <div className={styles.input_center_item}>
                  <IoCloudUploadOutline size="4rem" />
                  ここに画像をドラッグ&ドロップ
                </div>
              </div>
              <input type="file" onChange={handleFileChange} ref={fileInputRef} accept="image/*" />
            </div>

            <div className={styles.input_details}>
              <h2>景品名を入力</h2>
              <input
                value={prizeNameJp}
                className={styles.input_form}
                type="text"
                name="nameJp"
                onChange={(event) => setPrizeNameJp(event.target.value)}
              />
            </div>
            <div className={styles.input_details}>
              <h2>英語名を入力</h2>
              <input
                value={prizeNameEn}
                className={styles.input_form}
                type="text"
                name="nameEn"
                onChange={(event) => setPrizeNameEn(event.target.value)}
              />
            </div>
          </div>
          <div className={styles.preview_group_content}>
            <h2>景品プレビュー</h2>
            {previewUrl ? (
              <div className={styles.previewImageWrap}>
                <Image
                  src={previewUrl}
                  alt="preview"
                  fill
                  sizes="(max-width: 768px) 72vw, 360px"
                  style={{ objectFit: "contain" }}
                />
              </div>
            ) : (
              <div className={styles.previewPlaceholder}>画像を選択してください</div>
            )}
            <input
              className={styles.button}
              type="submit"
              value="送信"
              onClick={() => void submit()}
              disabled={isSubmitting}
            />
          </div>
        </div>
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
