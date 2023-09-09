import type { NextPage } from "next";
import styles from "./prizes.module.css";
import Image from "next/image";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { BingoPrize,
  subscriptionBingoPrize,
  getBingoPrize,
 } from "@/utils/api_methods";

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // get

  useEffect(() => {
    async function fetchBingoPrizes() {
      try {
        const getData: BingoPrize[] = await getBingoPrize();
        if (getData) {
          setBingoPrize(getData);
        }

        const subscriptionData: BingoPrize[] = await subscriptionBingoPrize();
        setBingoPrize((prevBingoPrize) => {
          return prevBingoPrize.map((prize, index) => {
            if (prize.id === subscriptionData[index].id) {
              console.log(bingoPrize);
              return {
                ...prize,
                existing: subscriptionData[index].existing,
              };
            }
            return prize;
          })
        })
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }

    fetchBingoPrizes();
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
