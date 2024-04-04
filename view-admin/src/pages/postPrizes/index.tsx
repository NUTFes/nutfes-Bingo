/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import { useState, useCallback, useRef, useEffect } from "react";
import styles from "@/pages/postPrizes/postPrizes.module.css";
import { Header, PrizeResult } from "@/components/common";
import { IoCloudUploadOutline } from "react-icons/io5";
import { BingoPrize, getBingoPrize, postBingoPrize } from "@/utils/api_methods";

const Page: NextPage = () => {
  // アップロードした画像ファイルから取得したbase64
  const [displayImage, setDisplayImage] = useState<string>(""); // imagedata base64
  const [prizeName, setPrizeName] = useState<string>("");
  const [prizeExisting, setPrizeExisting] = useState<boolean>(false);
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // getしてきた画像

  /**
   * ファイルアップロードインプット変更時ハンドラ
   */
  const handlerChangeImageFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target?.files?.[0];
      if (!file) {
        return;
      }
      // 選択されたファイルが画像ファイル以外だったらreturn
      if (file.type !== "image/jpeg" && file.type !== "image/png") {
        // バリデーションメッセージ表示
        console.log("jpeg/pngファイルを選択してください");
        return;
      }
      const reader = new FileReader();
      // base64に変換
      reader.readAsDataURL(file);
      reader.onload = () => {
        // base64に変換した結果をstateにセットする
        setDisplayImage(reader.result as string);
        // console.log(reader.result)
        // createBingoPrize(reader.result as string)
      };
    },
    [],
  );
  useEffect(() => {
    async function getPrizeImage() {
      try {
        const getData: BingoPrize[] = await getBingoPrize();
        if (getData) {
          setBingoPrize(getData);
          console.log("getPrize");
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }
    getPrizeImage();
  }, []);

  const insertPrize = () => {
    console.error("押されたよ");
    if (displayImage === "" || prizeName === "") {
      alert("写真のアップロードと景品名の設定をしてください。");
      return;
    }
    postBingoPrize(prizeExisting, displayImage, prizeName);
    console.log(prizeExisting, displayImage, prizeName);
    setDisplayImage("");
    setPrizeName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    alert("景品を追加しました。");
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
        handlerChangeImageFileInput({
          target: { files: [file] },
        } as any);
      }
    },
    [handlerChangeImageFileInput],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <Header user="Admin">
        <button></button>
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
              onChange={handlerChangeImageFileInput}
              ref={fileInputRef}
            />
          </div>
          <div className={styles.input_details}>
            <h2>景品名を入力</h2>
            <input
              value={prizeName}
              className={styles.input_form}
              type="text"
              name="name"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPrizeName(e.target.value)
              }
            />
          </div>
        </div>
        <div className={styles.preview_group_content}>
          <h2>景品プレビュー</h2>
          <img
            src={(displayImage as string) || "image-placeholder.png"}
            alt=""
          />
          <input
            className={styles.button}
            type="submit"
            value="送信"
            onClick={insertPrize}
          />
        </div>
      </div>
      <PrizeResult
        prizeResult={bingoPrize}
        showToggle={false}
        showOverlay={false}
      />
    </div>
  );
};

export default Page;
