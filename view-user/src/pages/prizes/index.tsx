import type { NextPage } from "next";
import styles from "./prizes.module.css";
import Image from "next/image";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { BingoPrize, subscriptionBingoPrize } from "@/utils/api_methods";

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // get

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
