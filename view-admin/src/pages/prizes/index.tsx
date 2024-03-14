import type { NextPage } from "next";
import styles from "./prizes.module.css";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import {
  bingoPrizeGet as BPG,
  bingoPrizeSubscriptionExisting as BPSE,
  bingoPrizeUpdateExisiting as BPUE,
} from "../api/schema";

export interface BingoPrize {
  id: number;
  name: string;
  existing: boolean;
  image: string;
}

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<BingoPrize[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: query } = useQuery(BPG);
  const { data: subscription } = useSubscription(BPSE);


  //getは初回のみ
  useEffect(() => {
    if (query) {
      setBingoPrize(query.bingo_prize);
    }
  }, []);

  //これはトグルで発火させてる
  useEffect(() => {
    if (subscription && subscription.existing) {
      // console.log(bingoPrize);
      const existingData = subscription.existing;
      // bingoPrizeのexistingプロパティの値を更新
      setBingoPrize((Prizes) =>
        Prizes.map((prize) => ({
          ...prize, // 他のプロパティは変更しない
          existing:
            existingData.find((item: BingoPrize) => item.id === prize.id)
              ?.existing || prize.existing,
        }))
      );
    }
  }, [subscription]);

  useEffect(() => {
    if (searchText === "") {
      setSearchResults([]);
    } else {
      setSearchResults(
        bingoPrize.filter((prize) =>
          prize.name.toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }
  }, [searchText, bingoPrize]);

  const handleSearch = () => {
    const searchInput = searchRef.current;
    if (searchInput && searchResults.length > 0) {
      const firstResultElement = document.getElementById(
        `prize-${searchResults[0].id}`
      );
      firstResultElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <div className={styles.container}>
      <Header user="Admin">
        <div className={styles.main}>
          <Button size="m" shape="circle" onClick={() => router.push("/")}>
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
      />
    </div>
  );
};

export default Page;
