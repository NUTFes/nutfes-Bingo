import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Image from "next/image";
import styles from "@/styles/Home.module.css";
import { Header, Modal, BingoResult, Button } from "@/components/common";
import { useRouter } from "next/router";
import { ja } from "../locales/ja";
import { en } from "../locales/en";
import { MdTranslate } from "react-icons/md";
import { useSubscription } from "@apollo/client";
import { bingoNumberSubscription as BNS } from "./api/schema";
import { BingoNumber } from "@/type/common";

const Page: NextPage = () => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isOpened, setIsOpened] = useState(true);
  const router = useRouter();
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);

  const { data } = useSubscription(BNS);

  //subscriptionを行うためのuseEffect
  useEffect(() => {
    if (data) {
      setBingoNumbers(data.bingo_number);
    }
  }, [data]);

  // 最初のrendrer時だけ実行してモーダルの再表示を防止する。
  useEffect(() => {
    const storedIsOpened = localStorage.getItem("isOpened");
    if (storedIsOpened !== null) {
      setIsOpened(JSON.parse(storedIsOpened));
    }
  }, []);

  // isOpenedの状態をもとにlocalStorageを更新する。
  // localStorageにbooleanが保存できないため、json形式に変換して保存する。
  useEffect(() => {
    localStorage.setItem("isOpened", JSON.stringify(isOpened));
  }, [isOpened]);

  // ページのリロード前にlocalStorageを削除する。
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem("isOpened");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div className={styles.container}>
      <Modal isOpened={isOpened} setisOpened={setIsOpened}>
        <div className={styles.languageBlock}>
          <div className={styles.language}>
            <p
              onClick={() => {
                router.push("/", "/", { locale: "ja" });
                setIsOpened(false);
              }}
            >
              日本語
            </p>
          </div>
          <div className={styles.language}>
            <p
              onClick={() => {
                router.push("/", "/", { locale: "en" });
                setIsOpened(false);
              }}
            >
              English
            </p>
          </div>
        </div>
      </Modal>
      <Header>
        {/* <div className={styles.main}>
          <Button
            size="m"
            shape="circle"
            onClick={() => router.push("./prizes")}
          >
            <div className={styles.buttonContents}>
              <Image src="/GiftBox.svg" alt="GiftBox" width={19} height={19} />
              {t.PRIZE_BUTTON}
            </div>
          </Button>
        </div> */}
      </Header>
      <BingoResult bingoResultNumber={bingoNumbers} />
      <Button size="null" shape="null" onClick={() => setIsOpened(true)}>
        <div className={styles.iconButton}>
          <MdTranslate size={35} />
        </div>
      </Button>
    </div>
  );
};

export default Page;
