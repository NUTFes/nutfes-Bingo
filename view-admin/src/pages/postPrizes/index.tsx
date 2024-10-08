import { useQuery, useMutation } from "@apollo/client";
/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import styles from "./postPrizes.module.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { Header, PrizeResult, Loading } from "@/components/common";
import { IoCloudUploadOutline } from "react-icons/io5";
import {
  GetListPrizesDocument,
  CreateOnePrizeDocument,
  CreateOneImageDocument,
} from "@/type/graphql";
import type {
  GetListPrizesQuery,
  CreateOneImageMutation,
  CreateOnePrizeMutation,
  CreateOneImageMutationVariables,
  CreateOnePrizeMutationVariables,
} from "@/type/graphql";

import { useRouter } from "next/router";

const Page: NextPage = () => {
  const [bingoPrize, setBingoPrize] = useState<GetListPrizesQuery["prizes"]>(
    [],
  );
  const [prizeNameJp, setPrizeNameJp] = useState<string>("");
  const [prizeNameEn, setPrizeNameEn] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File>();
  const [preview, setPreview] = useState({ uploadImageURL: "", type: "" });
  const [bucketName, setBucketName] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data } = useQuery<GetListPrizesQuery>(GetListPrizesDocument);
  const [postPrize] = useMutation<
    CreateOnePrizeMutation,
    CreateOnePrizeMutationVariables
  >(CreateOnePrizeDocument);
  const [postImage] = useMutation<
    CreateOneImageMutation,
    CreateOneImageMutationVariables
  >(CreateOneImageDocument);

  const router = useRouter();

  useEffect(() => {
    if (data) {
      setBingoPrize(data.prizes);
    }
  }, [data]);

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

      const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME;
      const fileName = targetFile.name;
      const fileType = targetFile.type;

      setBucketName(bucketName || "");
      setFileName(fileName);
      setFileType(fileType);
    },
    [],
  );

  const insertPrize = async (imageId: number) => {
    postPrize({
      variables: {
        isWon: false,
        imageId: imageId,
        nameJp: prizeNameJp,
        nameEn: prizeNameEn,
      },
    });
    setPrizeNameJp("");
    setPrizeNameEn("");
    setPreview({ uploadImageURL: "", type: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsDisabled(false);
    setIsLoading(false);
  };

  const insertImage = async () => {
    const result = await postImage({
      variables: {
        bucketName: bucketName,
        fileName: fileName,
        fileType: fileType,
      },
    });
    // ここでimageIdをuseStateに設定する
    const imageId = result.data?.insertImagesOne?.id;
    if (imageId) {
      insertPrize(imageId);
    }
  };

  const postMinio = async () => {
    if (!imageFile) {
      return alert("画像を選択してください");
    }
    if (prizeNameJp === "") {
      alert("景品名を入力してください。");
      setIsLoading(false);
      router.reload();
      return;
    }
    const formData = new FormData();
    formData.append("file", imageFile);
    const fileName = imageFile?.name || "";
    formData.append("fileName", fileName);

    const response = await fetch("/api/minio", {
      method: "POST",
      body: formData,
    });
    insertImage();
  };

  const submit = async () => {
    setIsDisabled(true);
    setIsLoading(true);
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
