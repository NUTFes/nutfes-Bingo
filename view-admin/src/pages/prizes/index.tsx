import type { NextPage } from "next";
import styles from "./prizes.module.css";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import {
  BingoPrize,
  subscriptionBingoPrize,
  getBingoPrize,
} from "@/utils/api_methods";

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // getしてきた画像
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<BingoPrize[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function getPrizeImage() {
      try {
        const getData: BingoPrize[] = await getBingoPrize();
        if (getData) {
          setBingoPrize(getData);
          console.log("getPrize");
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }
    getPrizeImage();
  }, []);

  useEffect(() => {
    async function subscriptionBingoExisting() {
      try {
        const subscriptionData: BingoPrize[] = await subscriptionBingoPrize();
        setBingoPrize((oldPrize) => {
          // existing プロパティを subscriptionData で更新
          const updatedPrizes = oldPrize.map((prize) => {
            const matchingSubscriptionPrize = subscriptionData.find(
              (subscriptionPrize) => subscriptionPrize.id === prize.id
            ); // oldPrizeとsubscriptionDataのidが一致するものを探して上書き
            return matchingSubscriptionPrize
              ? { ...prize, existing: matchingSubscriptionPrize.existing }
              : prize;
          });
          return updatedPrizes;
        });
      } catch (error) {}
    }
    subscriptionBingoExisting();
  }, [bingoPrize]);

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
      const firstResultElement = document.getElementById(`prize-${searchResults[0].id}`);
      firstResultElement?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      <PrizeResult prizeResult={searchText !== "" && searchResults.length > 0 ? searchResults : bingoPrize} />
    </div>
  );
};

export default Page;
