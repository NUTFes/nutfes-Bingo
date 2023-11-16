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
import { ja } from "../locales/ja";
import { en } from "../locales/en";

const Page: NextPage = () => {
  const { locale } = useRouter()
  const t = locale === "ja" ? ja : en;
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // get

  useEffect(() => {
    async function getPrizeImage() {
      try {
        const getData: BingoPrize[] = await getBingoPrize();
        if (getData) {
          setBingoPrize(getData);
          console.log("getPrize");
        }
      } catch (error) {
        console.log("データの取得中にえらーが発生しました:", error);
      }
    }
    getPrizeImage();
  }, []);

  useEffect(() => {
    async function subscriptionBingoExisting() {
      try {
        const subscriptionData: BingoPrize[] = await subscriptionBingoPrize();
        setBingoPrize((oldPrize) => {
          // existing プロパティを subscriptionData で更新
          const updatedPrizes = oldPrize.map((prize) => {
            const matchingSubscriptionPrize = subscriptionData.find(
              (subscriptionPrize) => subscriptionPrize.id === prize.id
            ); // oldPrizeとsubscriptionDataのidが一致するものを探して上書き
            return matchingSubscriptionPrize
              ? { ...prize, existing: matchingSubscriptionPrize.existing }
              : prize;
          });
          return updatedPrizes;
        });
      } catch (error) {}
    }
    subscriptionBingoExisting();
  }, [bingoPrize]);

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
              {t.NUMBER_BUTTON}
            </div>
          </Button>
        </div>
      </Header>
      <PrizeResult prizeResult={bingoPrize} />
    </div>
  );
};

export default Page;
