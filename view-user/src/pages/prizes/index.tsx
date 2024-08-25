import type { NextPage } from "next";
import styles from "./prizes.module.css";
import { PrizeCardList, Loading } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { ja } from "../../locales/ja";
import { en } from "../../locales/en";
import { useQuery, useSubscription } from "@apollo/client";
import {
  GetListPrizesDocument,
  SubscribeListPrizesIsWonDocument,
} from "@/type/graphql";
import type {
  GetListPrizesQuery,
  SubscribeListPrizesIsWonSubscription,
} from "@/type/graphql";
import { useRecoilState } from "recoil";
import { bingoPrizeState } from "../../Atom/atom";
import Layout from "@/components/Layout";

const Page: NextPage = () => {
  const { locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [isOpened, setIsOpened] = useState(false);
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useRecoilState(bingoPrizeState);
  const [isLodaing, setIsLoading] = useState<boolean>(true);

  const { data: query } = useQuery<GetListPrizesQuery>(GetListPrizesDocument);
  const { data: subscription } =
    useSubscription<SubscribeListPrizesIsWonSubscription>(
      SubscribeListPrizesIsWonDocument,
    );

  useEffect(() => {
    if (query) {
      setBingoPrize(query.prizes);
    }
  }, [query]);

  useEffect(() => {
    if (subscription && subscription.prizes) {
      setBingoPrize((prizes) =>
        prizes.map((prize) => {
          const updatePrize = subscription.prizes.find(
            (subscriptionPrize) => subscriptionPrize.id === prize.id,
          );
          return updatePrize ? { ...prize, isWon: updatePrize.isWon } : prize;
        }),
      );
    }
  }, [subscription]);

  return (
    <>
      {isLodaing && <Loading />}
      <div className={styles.container}>
        <Layout pageName="/prizes">
          <PrizeCardList BingoPrize={bingoPrize} />
        </Layout>
      </div>
    </>
  );
};

export default Page;
