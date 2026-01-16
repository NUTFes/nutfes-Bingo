"use client";
/* eslint-disable @next/next/no-img-element */
import styles from "./postPrizes.module.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { Header, PrizeResult, Loading } from "@/components/admin";
import { IoCloudUploadOutline } from "react-icons/io5";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapPrizeRow, type Prize } from "@/types";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const supabase = createSupabaseBrowserClient();

const Page = () => {
  const [bingoPrize, setBingoPrize] = useState<Prize[]>([]);
  const [prizeNameJp, setPrizeNameJp] = useState<string>("");
  const [prizeNameEn, setPrizeNameEn] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File>();
  const [preview, setPreview] = useState({ uploadImageURL: "", type: "" });
  const [bucketName, setBucketName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const fetchPrizes = useCallback(async () => {
    const { data, error } = await supabase
      .from("prizes")
      .select(
        "id, is_won, image_id, name_jp, name_en, created_at, updated_at, image:images(id, bucket_name, file_name, file_type, created_at, updated_at)",
      )
      .order("id", { ascending: true });
    if (!error && data) {
      setBingoPrize(data.map(mapPrizeRow));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    fetchPrizes();
  }, [fetchPrizes]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetFile = e.target.files![0]!;
      if (!targetFile) {
        setPreview({ uploadImageURL: "", type: "" });
        return;
      }
      setImageFile(targetFile);
      setPreview({
        uploadImageURL: URL.createObjectURL(targetFile),
        type: targetFile.type,
      });

      const bucketName =
        process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "bingo";
      const fileType = targetFile.type;

      setBucketName(bucketName);
      setFileType(fileType);
    },
    [],
  );

  const insertPrize = async (imageId: number) => {
    const { error } = await supabase.from("prizes").insert({
      is_won: false,
      image_id: imageId,
      name_jp: prizeNameJp,
      name_en: prizeNameEn,
    });
    if (error) {
      toast.error("景品の登録に失敗しました");
    } else {
      fetchPrizes();
    }
    setPrizeNameJp("");
    setPrizeNameEn("");
    setPreview({ uploadImageURL: "", type: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsDisabled(false);
    setIsLoading(false);
  };

  const insertImage = async (storedFileName: string, storedBucket: string) => {
    const { data, error } = await supabase
      .from("images")
      .insert({
        bucket_name: storedBucket,
        file_name: storedFileName,
        file_type: fileType,
      })
      .select("id")
      .single();
    if (error) {
      toast.error("画像情報の登録に失敗しました");
      return;
    }
    const imageId = data?.id;
    if (imageId) {
      insertPrize(imageId);
    }
  };

  const postStorage = async () => {
    if (!imageFile) {
      return alert("画像を選択してください");
    }
    if (prizeNameJp === "") {
      alert("景品名を入力してください。");
      setIsLoading(false);
      router.refresh();
      return;
    }
    const formData = new FormData();
    formData.append("file", imageFile);
    const fileName = imageFile?.name || "";
    formData.append("fileName", fileName);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      toast.error("画像のアップロードに失敗しました");
      setIsDisabled(false);
      setIsLoading(false);
      return;
    }
    const payload = await response.json().catch(() => null);
    const storedFileName = payload?.fileName || fileName;
    const storedBucket = payload?.bucketName || bucketName;
    insertImage(storedFileName, storedBucket);
  };

  const submit = async () => {
    setIsDisabled(true);
    setIsLoading(true);
    postStorage();
    toast.success("景品画像を登録しました");
  };

  const [isDragOver, setIsDragOver] = useState<boolean>(false);

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

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length) {
        const file = files[0];
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(event);
      }
    },
    [handleFileChange],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      {isLoading && <Loading />}
      <div>
        <Header user="Admin">
          <button />
        </Header>
        <div className={styles.input_group}>
          <div className={styles.input_group_content}>
            <div>
              <h2>登録する画像を選択</h2>
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
                  <IoCloudUploadOutline size="4rem" />
                  ここに画像をドラッグ&ドロップ
                </div>
              </div>
              <input
                type="file"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </div>

            <div className={styles.input_details}>
              <h2>景品名を入力</h2>
              <input
                value={prizeNameJp}
                className={styles.input_form}
                type="text"
                name="name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPrizeNameJp(e.target.value)
                }
              />
            </div>
            <div className={styles.input_details}>
              <h2>英語名を入力</h2>
              <input
                value={prizeNameEn}
                className={styles.input_form}
                type="text"
                name="name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPrizeNameEn(e.target.value)
                }
              />
            </div>
          </div>
          <div className={styles.preview_group_content}>
            <h2>景品プレビュー</h2>
            <img src={preview.uploadImageURL} alt="" />
            <input
              className={styles.button}
              type="submit"
              value="送信"
              onClick={submit}
              disabled={isDisabled}
            />
          </div>
        </div>
        <PrizeResult
          prizeResult={bingoPrize}
          setBingoPrize={setBingoPrize}
          showToggle={false}
          showOverlay={false}
        />
      </div>
    </div>
  );
};

export default Page;
