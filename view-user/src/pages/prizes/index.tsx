import type { NextPage } from "next";
import { PrizeCardList, Loading, Layout } from "@/components";
import { useRouter } from "next/router";
import { useState, useEffect, useCallback } from "react";
import { useRecoilState } from "recoil";
import { supabase, mapPrizeRow } from "@/lib/supabase";
import { bingoPrizeState } from "@/state/prize";

const Page: NextPage = () => {
  const { pathname: pageName } = useRouter();
  const [bingoPrize, setBingoPrize] = useRecoilState(bingoPrizeState);
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPrizes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prizes")
      .select(
        "id, is_won, image_id, name_jp, name_en, created_at, updated_at, image:images(id, bucket_name, file_name, file_type, created_at, updated_at)",
      )
      .order("id", { ascending: true });
    if (!error && data) {
      setBingoPrize(data.map(mapPrizeRow));
    }
    setLoading(false);
  }, [setBingoPrize]);

  useEffect(() => {
    fetchPrizes();

    const channel = supabase
      .channel("prizes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prizes" },
        () => {
          fetchPrizes();
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[Realtime] prizes channel error:", err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPrizes]);

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
