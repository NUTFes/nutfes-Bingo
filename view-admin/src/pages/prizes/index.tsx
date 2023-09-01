import type { NextPage } from "next";
import Image from "next/image";
import styles from "./prizes.module.css";
import { Header, Button, PrizeResult } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { BingoPrize, updatePrizeExisting, subscriptionBingoPrize } from "@/utils/api_methods";

const Page: NextPage = () => {
  const router = useRouter();
  const [bingoPrize, setBingoPrize] = useState<BingoPrize[]>([]); // getしてきた画像
  const [prizeExisting , setPrizeExisting] = useState<boolean>(false);
  const [prizeID , setPrizeID] = useState<number>(0);

  const updateExisting = () => {
    updatePrizeExisting(prizeID,prizeExisting);
    console.log(prizeID,prizeExisting);
  };
  
  useEffect(() => {
    async function fetchBingoPrizes() {
      try {
        const response: BingoPrize[] = await subscriptionBingoPrize();
        if (response) {
          setBingoPrize(response);
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }
  
    fetchBingoPrizes();
  }, [bingoPrize]);

// // トグルスイッチがクリックされた時の配列動作を定義
//   const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
//   const toggleNumber = (number: number) => {
//     if (selectedNumbers.includes(number)) {
//       setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
//     } else {
//       setSelectedNumbers([...selectedNumbers, number]);
//     }
//   };
//   useEffect(() => {
//     console.log("selectedNumbers:", selectedNumbers);
//   }, [selectedNumbers]);

      {/* <div
        className={`${styles.toggle_button} ${
          selectedNumbers.includes(1) ? styles.selected : ""
        }`}
      >
        <input
          id="toggle"
          className={styles.toggle_input}
          type="checkbox"
          checked={selectedNumbers.length === 31}
          onClick={() => toggleNumber(1)}
        />
        <label htmlFor="toggle" className={styles.toggle_label} /> */}

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

// // すべて選択・すべて選択解除 機能
//   const isAllSelected = selectedNumbers.length === 31;
//   const toggleSelectAll = () => {
//     if (isAllSelected) {
//       setSelectedNumbers([]);
//     } else {
//       const allNumbers = Array.from({ length: 31 }, (_, index) => index + 1);
//       setSelectedNumbers(allNumbers);
//     }
//   };

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
        <div>
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
          <PrizeResult prizeResult={bingoPrize} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default Page;