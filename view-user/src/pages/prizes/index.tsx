import type { NextPage } from "next";
import styles from "./prizes.module.css";
import Image from "next/image";
import { Header, Button, PrizeResult, Modal } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { ja } from "../locales/ja";
import { en } from "../locales/en";
import { MdTranslate } from "react-icons/md";
import { useQuery, useSubscription } from "@apollo/client";
import {
  bingoPrizeGet as BPG,
  bingoPrizeSubscriptionExisting as BPSE,
} from "../api/schema";
import { useRecoilState } from "recoil";
import { bingoPrizeState } from "../Atom/atom";

export interface BingoPrize {
  id: number;
  name: string;
  existing: boolean;
  image: string;
}

const Page: NextPage = () => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isOpened, setIsOpened] = useState(false);
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useRecoilState(bingoPrizeState);

  const { data: query } = useQuery(BPG);
  const { data: subscription } = useSubscription(BPSE);

  useEffect(() => {
    if (query) {
      setBingoPrize(query.bingo_prize);
    }
  });

  useEffect(() => {
    if (subscription) {
      setBingoPrize((prizes) =>
        prizes.map((prize) => ({
          ...prize,
          existing:
            subscription.bingo_prize.find(
              (subscriptionPrize: BingoPrize) =>
                subscriptionPrize.id === prize.id
            )?.existing || prize.existing,
        }))
      );
    }
  }, [subscription]);

  return (
    <div className={styles.container}>
      <Modal isOpened={isOpened} setisOpened={setIsOpened}>
        <div className={styles.languageBlock}>
          <div className={styles.language}>
            <p
              onClick={() => {
                router.push("/prizes", "/prizes", { locale: "ja" });
                setIsOpened(false);
              }}
            >
              日本語
            </p>
          </div>
          <div className={styles.language}>
            <p
              onClick={() => {
                router.push("/prizes", "/prizes", { locale: "en" });
                setIsOpened(false);
              }}
            >
              English
            </p>
          </div>
        </div>
      </Modal>
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
      <Button size="null" shape="null" onClick={() => setIsOpened(true)}>
        <div className={styles.iconButton}>
          <MdTranslate size={35} />
        </div>
      </Button>
    </div>
  );
};

export default Page;
