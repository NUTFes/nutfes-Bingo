"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import styles from "@/styles/Home.module.css";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapNumberRow, type BingoNumber } from "@/types";
import { Layout, Loading, NumberCardLarge, NumberCardList } from "@/components";

type BingoNumbers = BingoNumber[];

const supabase = createSupabaseBrowserClient();

const sortById = (bingoNumbers: BingoNumbers) => {
  return [...bingoNumbers].sort((a, b) => a.id - b.id);
};

const sortByNumber = (bingoNumbers: BingoNumbers) => {
  return [...bingoNumbers].sort((a, b) => a.number - b.number);
};

// 最後に追加されたビンゴ番号（最新の番号）を取得
const getLastBingoNumber = (bingoNumbers: BingoNumbers) => {
  const sortedById = sortById(bingoNumbers);
  return sortedById[sortedById.length - 1];
};

const getDisplayBingoNumbers = (
  isSortedAscending: boolean,
  bingoNumbers: BingoNumbers,
) => {
  if (isSortedAscending) {
    return { list: sortByNumber(bingoNumbers) };
  }

  const sortedById = sortById(bingoNumbers);
  const lastBingoNumber = sortedById[sortedById.length - 1];
  return {
    large: lastBingoNumber,
    list: sortedById.slice(0, -1).reverse(),
  };
};

const Page = () => {
  const pageName = usePathname() ?? "/";
  const [isSortedAscending, setIsSortedAscending] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);

  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("numbers")
      .select("id, number, created_at, updated_at")
      .order("id", { ascending: true });
    if (!error && data) {
      setBingoNumbers(data.map(mapNumberRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchNumbers();
    };
    load();

    const channel = supabase
      .channel("numbers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "numbers" },
        () => {
          fetchNumbers();
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[Realtime] numbers channel error:", err);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchNumbers]);

  const displayBingoNumbers = getDisplayBingoNumbers(
    isSortedAscending,
    bingoNumbers,
  );

  return (
    <>
      {loading && <Loading />}
      <Layout
        pageName={pageName}
        isSortedAscending={isSortedAscending}
        setIsSortedAscending={setIsSortedAscending}
      >
        <div className={styles.numberCardLarge}>
          {!isSortedAscending && displayBingoNumbers.large && (
            <NumberCardLarge bingoNumber={displayBingoNumbers.large} />
          )}
          <NumberCardList bingoNumber={displayBingoNumbers.list} />
        </div>
      </Layout>
    </>
  );
};

export default Page;
