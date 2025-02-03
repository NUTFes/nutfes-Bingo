import { useQuery, useMutation } from "@apollo/client";
/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import styles from "./postPrizes.module.css";
import { useState, useCallback, useRef } from "react";
import { Header, PrizeResult, Loading } from "@/components/common";
import { IoCloudUploadOutline } from "react-icons/io5";
import {
  GetListPrizesDocument,
  GetListPrizesQuery,
  CreatePrizeWithImageMutation,
  CreatePrizeWithImageDocument,
} from "@/type/graphql";

import { useRouter } from "next/router";

type PrizeName = {
  nameJp: string;
  nameEn: string;
};

const Page: NextPage = () => {
  const [prizeName, setPrizeName] = useState<PrizeName>({
    nameJp: "",
    nameEn: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File>();
  const [preview, setPreview] = useState({ uploadImageURL: "", type: "" });
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const { data } = useQuery<GetListPrizesQuery>(GetListPrizesDocument);
  const bingoPrizes: GetListPrizesQuery["prizes"] = data?.prizes ?? [];
  const router = useRouter();

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
    },
    [],
  );
  const [createPrizeWithImage, loading] =
    useMutation<CreatePrizeWithImageMutation>(CreatePrizeWithImageDocument);

  const postMinio = async () => {
    if (!imageFile) {
      return alert("画像を選択してください");
    }
    if (prizeName.nameJp === "") {
      alert("景品名を入力してください。");
      router.reload();
      return;
    }
    const formData = new FormData();
    formData.append("file", imageFile);
    const fileNameFromImage = imageFile.name || "";
    formData.append("fileName", fileNameFromImage);

    try {
      const response = await fetch("/api/minio", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("MinIOへのアップロードに失敗しました");
      }
      const minioData = await response.json();

      await createPrizeWithImage({
        variables: {
          isWon: false,
          nameJp: prizeName.nameJp,
          nameEn: prizeName.nameEn,
          bucketName: minioData.bucketName,
          fileName: minioData.fileName,
          fileType: minioData.fileType,
        },
      });

      // 登録成功時の処理
      setPrizeName({ nameJp: "", nameEn: "" });
      setPreview({ uploadImageURL: "", type: "" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("画像送信エラー:", error);
      alert("画像アップロードに失敗しました");
    }
    setIsDisabled(false);
  };

  const submit = async () => {
    setIsDisabled(true);
    postMinio();
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
        handleFileChange({
          target: { files: [file] },
        } as any);
      }
    },
    [handleFileChange],
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      {loading && <Loading />}
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
                value={prizeName.nameJp}
                className={styles.input_form}
                type="text"
                name="name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPrizeName((prev) => ({
                    ...prev,
                    nameJp: e.target.value,
                  }))
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
          prizeResult={bingoPrizes}
          showToggle={false}
          showOverlay={false}
        />
      </div>
    </div>
  );
};

export default Page;
