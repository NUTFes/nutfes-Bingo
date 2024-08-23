import type { NextPage } from "next";
import styles from "./prizes.module.css";
import Image from "next/image";
import {
  Header,
  Button,
  PrizeResult,
  Modal,
  PrizeCardList,
  Loading,
} from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { ja } from "../../locales/ja";
import { en } from "../../locales/en";
import { MdTranslate } from "react-icons/md";
import { useQuery, useSubscription } from "@apollo/client";
import {
  bingoPrizeGet as BPG,
  bingoPrizeSubscriptionIsWon as BPSIW,
} from "../api/schema";
import { useRecoilState } from "recoil";
import { bingoPrizeState } from "../../Atom/atom";
import { BingoPrize } from "@/type/common";
import Layout from "@/components/Layout";

const Page: NextPage = () => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isOpened, setIsOpened] = useState(false);
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useRecoilState(bingoPrizeState);
  const [isLodaing, setIsLoading] = useState<boolean>(true);

  const { data: query } = useQuery(BPG);
  const { data: subscription } = useSubscription(BPSIW);

  // useEffect(() => {
  //   if (query) {
  //     setBingoPrize(query.bingo_prize);
  //   }
  // });

  useEffect(() => {
    if (query && query.bingo_prize) {
      setIsLoading(true);
      // データ変換処理を追加
      const transformedData = query.bingo_prize.map((item: any) => ({
        id: item.id,
        nameJp: item.nameJp,
        nameEn: item.nameEn,
        isWon: item.isWon,
        imageId: item.imageId,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        prizeImage: item.prize_image
          ? {
              id: item.prize_image.id,
              bucketName: item.prize_image.bucketName,
              fileName: item.prize_image.fileName,
              fileType: item.prize_image.fileType,
              createdAt: item.prize_image.created_at,
              updatedAt: item.prize_image.updated_at,
            }
          : undefined,
      }));
      setBingoPrize(transformedData);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subscription) {
      setBingoPrize((prizes: BingoPrize[]) =>
        prizes.map((prize) => ({
          ...prize,
          isWon:
            subscription.bingo_prize.find(
              (subscriptionPrize: BingoPrize) =>
                subscriptionPrize.id === prize.id,
            )?.isWon || prize.isWon,
        })),
      );
    }
  }, [subscription]);

  return (
    <>
      {isLodaing && <Loading />}
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
        {/* pageNameに何を入れればいいか分からない */}
        <Layout pageName="/prizes/index.ts">
          <PrizeCardList BingoPrize={bingoPrize} />
        </Layout>
      </div>
    </>
  );
};

export default Page;
