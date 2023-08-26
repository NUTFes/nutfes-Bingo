import type { NextPage } from "next";
import { useState, useCallback, useEffect } from "react";
import styles from "@/styles/Home.module.css";
import { BingoPrize, createBingoPrize, subscriptionBingoPrize} from "@/utils/api_methods";



const Page: NextPage = () => {
  // アップロードした画像ファイルから取得したbase64
  const [displayImage, setDisplayImage] = useState<string | ArrayBuffer | null>(null);
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]);


  useEffect(() => {
    async function fetchBingoPrizes() {
      try {
        const response: BingoPrize[] = await subscriptionBingoPrize();
        if (response) {
          setBingoPrize(response);
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }

    fetchBingoPrizes();
  }, [bingoPrize]);

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
      // console.log(reader.result)
      // createBingoPrize(reader.result as string)
    };
  }, []);

  const submitImage = () => {
    if (displayImage != "") {
      createBingoPrize(displayImage as string);
      setDisplayImage("");
    }
  };

  return (
    <div className={styles.container}>
      <div>
        <h1>
          アップロードした画像をbase64変換
        </h1>
        <input type="file" onChange={handlerChangeImageFileInput} />
        <input type="submit" value="送信" onClick={submitImage} />
        <img
          src={(displayImage as string) || ""}
          alt=""
          width="100px"
          height="100px"
          />
      </div>
      <div className={styles.img}>
        {[...bingoPrize].map((data, index) => (
          // eslint-disable-next-line react/jsx-key, @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          style={{ width: '30%' }}
        ></img>
        ))}
      </div>
    </div>
  );
}
export default Page;
