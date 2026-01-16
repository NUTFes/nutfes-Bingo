"use client";

import styles from "./prizes.module.css";
import { Header, Button, PrizeResult } from "@/components/admin";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapPrizeRow, type Prize } from "@/types";

const supabase = createSupabaseBrowserClient();

const Page = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<Prize[]>([]);
  const [searchText, setSearchText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null); // Added searchRef as it's used in handleSearch
  const searchResults = useMemo(() => {
    if (searchText === "") {
      return [];
    }
    return bingoPrize.filter((prize) =>
      prize.nameJp.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [searchText, bingoPrize]);

  const handleSearch = () => {
    const searchInput = searchRef.current;
    if (searchInput && searchResults.length > 0) {
      const firstResultElement = document.getElementById(
        `prize-${searchResults[0].id}`,
      );
      firstResultElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Added useEffect to fetch prizes, as it's missing but implied by bingoPrize state
  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase
        .from("prizes")
        .select(
          "id, is_won, image_id, name_jp, name_en, created_at, updated_at, image:images(id, bucket_name, file_name, file_type, created_at, updated_at)",
        )
        .order("id", { ascending: true });
      if (!error && data) {
        setBingoPrize(data.map(mapPrizeRow));
      }
    };
    fetchPrizes();
  }, []);

  return (
    <div className={styles.container}>
      <Header user="Admin">
        <div className={styles.main}>
          <Button size="m" shape="circle" onClick={() => router.push("/admin")}>
            <div className={styles.buttonContents}>番号入力</div>
          </Button>
        </div>
      </Header>
      <div className={styles.title}>
        <div className={styles.title_button}>
          <input
            ref={searchRef}
            className={styles.search_box}
            type="text"
            placeholder="検索..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <button className={styles.search_button} onClick={handleSearch}>
            検索
          </button>
        </div>
      </div>
      <PrizeResult
        prizeResult={
          searchText !== "" && searchResults.length > 0
            ? searchResults
            : bingoPrize
        }
        setBingoPrize={setBingoPrize}
        showOverlay={true}
        showToggle={true}
      />
    </div>
  );
};

export default Page;
