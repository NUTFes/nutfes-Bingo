import type { NextPage } from "next";
import { useState, useCallback } from "react";
import styles from "@/styles/Home.module.css";
import {
} from "@/components/common";
import { createImage} from "@/utils/api_methods";
const Page: NextPage = () => {
  // アップロードした画像ファイルから取得したbase64
  const [displayImage, setDisplayImage] = useState<string | ArrayBuffer | null>(null);
  /**
   * ファイルアップロードインプット変更時ハンドラ
   */
  const handlerChangeImageFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      return;
    }
    // 選択されたファイルが画像ファイル以外だったらreturn
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      // バリデーションメッセージ表示
      console.log('jpeg/pngファイルを選択してください');
      return;
    }
    const reader = new FileReader();
    // base64に変換
    reader.readAsDataURL(file);
    reader.onload = () => {
      // base64に変換した結果をstateにセットする
      setDisplayImage(reader.result);
      console.log(reader.result)
      createImage(reader.result as string)
    };
  }, []);
  return (
    <div>
      <h1>
        アップロードした画像をbase64変換
      </h1>
      <input type="file" onChange={handlerChangeImageFileInput} />
      <img
        src={(displayImage as string) || ""}
        alt=""
        width="100px"
        height="100px"
        />
    </div>
  );
}
export default Page;
