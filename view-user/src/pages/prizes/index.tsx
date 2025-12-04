import type { NextPage } from "next";
import { PrizeCardList, Loading, Layout } from "@/components";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { ja, en } from "@/locales";
import { useAtom } from "jotai";
import { useQuery, useSubscription } from "@apollo/client";
import {
  GetListPrizesDocument,
  SubscribeListPrizesIsWonDocument,
} from "@/types/graphql";
import type {
  GetListPrizesQuery,
  SubscribeListPrizesIsWonSubscription,
} from "@/types/graphql";
import { bingoPrizeState } from "../../Atom/atom";

const Page: NextPage = () => {
  const { pathname: pageName, locale } = useRouter();
  const t = locale === "ja" ? ja : en;
  const [bingoPrize, setBingoPrize] = useAtom(bingoPrizeState);
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);

  const { data: query, loading } = useQuery<GetListPrizesQuery>(
    GetListPrizesDocument,
  );
  const { data: subscription } =
    useSubscription<SubscribeListPrizesIsWonSubscription>(
      SubscribeListPrizesIsWonDocument,
    );

  useEffect(() => {
    if (query) {
      setBingoPrize(query?.prizes);
    }
  }, [query, setBingoPrize]);

  useEffect(() => {
    if (subscription && subscription.prizes) {
      setBingoPrize((prizes: GetListPrizesQuery["prizes"]) =>
        prizes.map((prize: GetListPrizesQuery["prizes"][0]) => {
          const updatePrize = subscription.prizes.find(
            (
              subscriptionPrize: SubscribeListPrizesIsWonSubscription["prizes"][0],
            ) => subscriptionPrize.id === prize.id,
          );
          return updatePrize ? { ...prize, isWon: updatePrize.isWon } : prize;
        }),
      );
    }
  }, [subscription, setBingoPrize]);

  return (
    <>
      {loading && <Loading />}
      <Layout
        pageName={pageName}
        isSortedAscending={isSortedAscending}
        setIsSortedAscending={setIsSortedAscending}
      >
        <PrizeCardList BingoPrize={bingoPrize} />
      </Layout>
    </>
  );
};

export default Page;
