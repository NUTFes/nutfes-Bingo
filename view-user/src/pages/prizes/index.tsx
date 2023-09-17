import type { NextPage } from "next";
import styles from "./prizes.module.css";
import Image from "next/image";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import {
  BingoPrize,
  subscriptionBingoPrize,
  getBingoPrize,
} from "@/utils/api_methods";
import { bingoPrizesState } from "../atom";
import { useRecoilState } from "recoil";

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useRecoilState(bingoPrizesState);

  useEffect(() => {
    async function getPrizesImage() {
      try {
        const getData: BingoPrize[] = await getBingoPrize();
        if (getData) {
          setBingoPrize(getData);
          console.log("getPrizeImageした");
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }
    getPrizesImage();
  }, []); // このuseEffectはページ読み込み時に1度だけ実行したい

  useEffect(() => {
    async function subscriptionBingoExisting() {
      try {
        // サブスクリプションを使用してデータを取得
        const subscriptionData: BingoPrize[] = await subscriptionBingoPrize();

        setBingoPrize((oldPrize) => {
          // existing プロパティを subscriptionData の値で上書き
          const updatedPrizes = oldPrize.map((prize) => {
            const matchingSubscriptionPrize = subscriptionData.find((subscriptionPrize) => subscriptionPrize.id === prize.id);  // oldPrizeとsubscriptionDataのidが一致するものを探して上書きする
            return matchingSubscriptionPrize ? { ...prize, existing: matchingSubscriptionPrize.existing } : prize;
          });
          return updatedPrizes;
        });
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }
    subscriptionBingoExisting();
  }, [bingoPrize, setBingoPrize]);

  return (
    <div className={styles.container}>
      <Header user="">
        <div className={styles.main}>
          <Button size="m" shape="circle" onClick={() => router.push("/")}>
            <div className={styles.buttonContents}>
              <Image
                src="/BingoCard.svg"
                alt="BingoCard"
                width={25}
                height={25}
              />
              Number
            </div>
          </Button>
        </div>
      </Header>
      <PrizeResult prizeResult={bingoPrize} />
    </div>
  );
};

export default Page;
