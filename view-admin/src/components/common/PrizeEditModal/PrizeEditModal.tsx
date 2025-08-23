import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import styles from "./PrizeEditModal.module.css";
import { RxCrossCircled } from "react-icons/rx";
import { useMutation } from "@apollo/client";
import { toast } from "react-toastify";
import {
  CreateOneImageDocument,
  type CreateOneImageMutation,
  type CreateOneImageMutationVariables,
} from "@/type/graphql";
import { IoCloudUploadOutline } from "react-icons/io5";
import Image from "next/image";

interface Props {
  isOpened: boolean;
  setIsOpened: (v: boolean) => void;
  canCloseByClickingBackground?: boolean;
  // initial values
  id: number;
  initialNameJp?: string | null;
  initialNameEn?: string | null;
  initialImageId?: number | null;
  initialBucketName?: string | null;
  initialFileName?: string | null;
  initialFileType?: string | null;
  onSubmit: (params: {
    nameJp: string;
    nameEn: string;
    imageId?: number | null;
    image?: {
      id: number;
      bucketName: string;
      fileName: string;
      fileType: string;
    };
  }) => Promise<void> | void;
}

const PrizeEditModal = ({
  isOpened,
  setIsOpened,
  canCloseByClickingBackground = true,
  id,
  initialNameJp = "",
  initialNameEn = "",
  initialImageId = null,
  initialBucketName,
  initialFileName,
  initialFileType,
  onSubmit,
}: Props) => {
  const close = () => setIsOpened(false);

  const [nameJp, setNameJp] = useState<string>(initialNameJp || "");
  const [nameEn, setNameEn] = useState<string>(initialNameEn || "");
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetFile = e.target.files?.[0];
      if (!targetFile) {
        setNewFile(null);
        return;
      }
      setNewFile(targetFile);
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length) {
      const file = files[0];
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) fileInputRef.current.files = dt.files;
      setNewFile(file);
    }
  }, []);
  const triggerFileInput = () => fileInputRef.current?.click();

  // Refresh initial values when modal opens for a different prize
  useEffect(() => {
    if (isOpened) {
      setNameJp(initialNameJp || "");
      setNameEn(initialNameEn || "");
      setSelectedImageId(initialImageId ?? null);
    }
  }, [isOpened, initialNameJp, initialNameEn, initialImageId]);

  const [createImage] = useMutation<
    CreateOneImageMutation,
    CreateOneImageMutationVariables
  >(CreateOneImageDocument);

  const currentImageText = useMemo(() => {
    if (initialImageId && initialBucketName && initialFileName) {
      return `${initialBucketName}/${initialFileName}`;
    }
    return "(画像なし)";
  }, [initialImageId, initialBucketName, initialFileName]);

  // preview URL handling (existing image fallback and cleanup)
  useEffect(() => {
    if (newFile) {
      const url = URL.createObjectURL(newFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (initialBucketName && initialFileName) {
      setPreviewUrl(
        `${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}/${initialBucketName}/${initialFileName}`,
      );
    } else {
      setPreviewUrl("");
    }
  }, [newFile, initialBucketName, initialFileName]);

  const handleSubmit = async () => {
    // If a new file is chosen, upload to MinIO first and insert DB record
    if (newFile) {
      try {
        const form = new FormData();
        form.append("file", newFile);
        const res = await fetch("/api/minio", { method: "POST", body: form });
        if (!res.ok) throw new Error("upload failed");

        const bucketName = "bingo"; // default bucket used by API/seeds
        const fileName = newFile.name;
        const fileType = newFile.type || "application/octet-stream";

        const { data } = await createImage({
          variables: { bucketName, fileName, fileType },
        });
        const newImageId = data?.insertImagesOne?.id ?? null;
        if (newImageId == null) throw new Error("image id missing");
        await onSubmit({
          nameJp,
          nameEn,
          imageId: newImageId,
          image: { id: newImageId, bucketName, fileName, fileType },
        });
        toast.success("景品を更新しました");
      } catch (e) {
        console.error(e);
        toast.error("画像のアップロードまたは更新に失敗しました");
        return; // keep modal open on error
      }
    } else {
      await onSubmit({ nameJp, nameEn });
      toast.success("景品を更新しました");
    }
    close();
  };

  if (!isOpened) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <button className={styles.btnClose} onClick={close}>
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
            <label className={styles.label}>現在の画像</label>
            <div className={styles.imagePreview}>{currentImageText}</div>
            {previewUrl && (
              <div className={styles.previewContainer}>
                <Image
                  className={styles.previewImage}
                  src={previewUrl}
                  alt="preview"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
            )}
            <div
              className={
                isDragOver ? styles.drop_area_drag_over : styles.drop_area
              }
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
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
            <button
              className={`${styles.btn} ${styles.cancel}`}
              onClick={close}
            >
              キャンセル
            </button>
            <button
              className={`${styles.btn} ${styles.primary}`}
              onClick={handleSubmit}
            >
              保存
            </button>
          </div>
        </div>
      </div>
      {canCloseByClickingBackground && (
        <div className={styles.background} onClick={close} />
      )}
    </div>
  );
};

export default PrizeEditModal;
