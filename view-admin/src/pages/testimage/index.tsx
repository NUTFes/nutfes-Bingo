import type { NextPage } from "next";
import { useState, useCallback, useEffect } from "react";
import styles from "@/styles/Home.module.css";
import { BingoPrize, createBingoPrize, postBingoPrize, subscriptionBingoPrize, updateBingoPrize} from "@/utils/api_methods";



const Page: NextPage = () => {
  // アップロードした画像ファイルから取得したbase64
  const [displayImage, setDisplayImage] = useState<string>("");  // imagedata base64
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // getしてきた画像
  const [prizeName, setPrizeName] = useState<string>("");
  const [prizeExisting , setPrizeExisting] = useState<boolean>(false);
  const [prizeID , setPrizeID] = useState<number>(0);

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
      setDisplayImage(reader.result as string);
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

  const updateExisting = () => {
    updateBingoPrize(prizeID,prizeExisting);
    console.log(prizeID,prizeExisting);
  };

  const insertPrize = () => {
    postBingoPrize(prizeExisting, displayImage, prizeName);
    console.log(prizeExisting, displayImage, prizeName)
  }

  return (
    <div className={styles.container}>
      <div>
      <input
        type="checkbox"
        name="existing"
        onChange={() => setPrizeExisting(!prizeExisting)}
        />
      <label htmlFor="existing">当選</label>
      <input
        type="text"
        name="name"
        placeholder="景品名"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrizeName(e.target.value)}
        />
        <h1>
          アップロードした画像をbase64変換
        </h1>
        <input type="file" onChange={handlerChangeImageFileInput} />
        <input type="submit" value="送信" onClick={insertPrize} />
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
      <h1>update処理</h1>
      <div>
      <input
        type="number"
        name="name"
        placeholder="ID番号"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrizeID(e.target.valueAsNumber)}
        />
      <input
        type="checkbox"
        placeholder="当選されたかどうか"
        onChange={() => setPrizeExisting(!prizeExisting)}
        // checked={setPrizeExisiting(!prizeExisting)} // または {false}、必要な値に変更してください
        />
        <input type="submit" value="送信" onClick={updateExisting} />
      </div>

    </div>
  );
}
export default Page;
