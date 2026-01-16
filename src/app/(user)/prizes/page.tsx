"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PrizeCardList, Loading, Layout } from "@/components";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapPrizeRow } from "@/types";
import { useUserStore } from "@/stores/useUserStore";

const supabase = createSupabaseBrowserClient();

const Page = () => {
  const pageName = usePathname() ?? "/prizes";
  const bingoPrize = useUserStore((state) => state.bingoPrize);
  const setBingoPrize = useUserStore((state) => state.setBingoPrize);
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
    // eslint-disable-next-line
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
