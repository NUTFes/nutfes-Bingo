import type { NextPage } from "next";
import { useState, useCallback } from "react";
import styles from "@/styles/Home.module.css";
import { Header } from "@/components/common";
import { BingoPrize } from "../prizes";
import { bingoPrizeCreate as BPC } from "../api/schema";
import { useMutation } from "@apollo/client";

const Page: NextPage = () => {
  // アップロードした画像ファイルから取得したbase64
  const [prizeImage, setPrizeImage] = useState<string>(""); // imagedata base64
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]);
  const [prizeName, setPrizeName] = useState<string>("");
  const [prizeExisting, setPrizeExisting] = useState<boolean>(false);

  const [postPrize] = useMutation(BPC);

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
        setPrizeImage(reader.result as string);
      };
    },
    []
  );

  const insertPrize = () => {
    postPrize({
      variables: {
        existing: prizeExisting,
        image: prizeImage,
        name: prizeName,
      },
    });
    console.log(prizeExisting, prizeImage, prizeName);
    setPrizeExisting(false);
    setPrizeImage("");
    setPrizeName("");
    const formName = document.getElementById("Name");
    const formImageName = document.getElementById("ImageName");
    const formCheckbox = document.getElementById("Checkbox");
    if (
      formCheckbox instanceof HTMLInputElement &&
      formCheckbox.type === "checkbox"
    ) {
      formCheckbox.checked = false;
    }
    if (formName instanceof HTMLInputElement) {
      formName.value = "";
    }
    if (formImageName instanceof HTMLInputElement) {
      formImageName.value = "";
    }
  };

  return (
    <div className={styles.container}>
      <Header user="Admin">Post Prizes</Header>
      <div>
        <input
          id="Checkbox"
          type="checkbox"
          name="existing"
          onChange={() => setPrizeExisting(!prizeExisting)}
        />
        <label htmlFor="existing">当選</label>
        <input
          id="Name"
          type="text"
          name="name"
          placeholder="景品名"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPrizeName(e.target.value)
          }
        />
        <h1>アップロードした画像をbase64変換</h1>
        <input
          id="ImageName"
          type="file"
          onChange={handlerChangeImageFileInput}
        />
        <input type="submit" value="送信" onClick={insertPrize} />
        <img
          src={(prizeImage as string) || ""}
          alt=""
          width="100px"
          height="100px"
        />
      </div>
      <div className={styles.img}>
        {[...bingoPrize].map((data, index) => (
          // eslint-disable-next-line react/jsx-key, @next/next/no-img-element
          <img src={data.image} alt="" style={{ width: "30%" }}></img>
        ))}
      </div>
    </div>
  );
};

export default Page;
