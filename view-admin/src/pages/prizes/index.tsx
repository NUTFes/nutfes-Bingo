import type { NextPage } from "next";
import Image from "next/image";
import styles from "./prizes.module.css";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import {
  BingoPrize,
  subscriptionBingoPrize,
  getBingoPrize,
} from "@/utils/api_methods";

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // getしてきた画像

  useEffect(() => {
    async function fetchBingoPrizes() {
      try {
        const getData: BingoPrize[] = await getBingoPrize();
        if (getData) {
          setBingoPrize(getData);
        }

        const subscriptionData: BingoPrize[] = await subscriptionBingoPrize();
        setBingoPrize((BingoPrize) => {
          return [...BingoPrize];
        })
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }

    fetchBingoPrizes();
  }, [bingoPrize]);

  // 景品の文字検索機能 pタグの要素を取得しています。
  const [searchText, setSearchText] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  useEffect(() => {
    if (searchDone) {
      const elements = Array.from(document.querySelectorAll("p"));
      elements.forEach((element) => {
        if (
          element &&
          element.textContent &&
          element.textContent.includes(searchText)
        ) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
    setSearchDone(false);
  }, [searchText, searchDone]);

  const handleSearch = () => {
    setSearchDone(true);
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
          {/* <Button size="m" shape="circle" onClick={toggleSelectAll}>
            {selectedNumbers.length === 31 ? "すべて選択解除" : "すべて選択"}
          </Button>
        </div> */}
          <input
            className={styles.search_box}
            type="text"
            placeholder="検索..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button className={styles.search_button} onClick={handleSearch}>
            検索
          </button>
        </div>
      </div>
      <PrizeResult prizeResult={bingoPrize} />
    </div>
  );
};

export default Page;
