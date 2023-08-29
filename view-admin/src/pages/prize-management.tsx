import type { NextPage } from "next";
import Image from "next/image";
import styles from "@/styles/prize-management.module.css";
import { Header, Button } from "@/components/common";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const Page: NextPage = () => {
  const router = useRouter();

// トグルスイッチがクリックされた時の配列動作を定義
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const toggleNumber = (number: number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
    } else {
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };
  useEffect(() => {
    console.log("selectedNumbers:", selectedNumbers);
  }, [selectedNumbers]);


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

// すべて選択・すべて選択解除 機能
  const isAllSelected = selectedNumbers.length === 31;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedNumbers([]);
    } else {
      const allNumbers = Array.from({ length: 31 }, (_, index) => index + 1);
      setSelectedNumbers(allNumbers);
    }
  };

  return (
    <div className={styles.container}>
      <Header user="">
        <div className={styles.main}>
          <Button size="m" shape="circle" onClick={() => router.push("/")}>
            <div className={styles.buttonContents}>番号入力ページ</div>
          </Button>
        </div>
      </Header>
      <div className={styles.title}>
        <div className={styles.title_button}>
          <Button size="m" shape="circle" onClick={toggleSelectAll}>
            {selectedNumbers.length === 31 ? "すべて選択解除" : "すべて選択"}
          </Button>
        </div>
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
        </div>
      </div>

      <div className={styles.grid_01}>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/01_Apple Watch SE.jpg"
            alt="Image01"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "56%",
              height: "auto",
            }}
          />
          <p>Apple Watch</p>
          <div
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
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/02_黒毛和牛1kg.jpg"
            alt="Image02"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "46%",
              height: "auto",
            }}
          />
          <p>黒毛和牛1kg</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(2) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(2)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/03_選べるペアチケット.jpg"
            alt="Image03"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "77%",
              height: "auto",
            }}
          />
          <p>選べるペアチケット</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(3) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(3)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/04_コーヒーメーカー.jpg"
            alt="Image04"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "47%",
              height: "auto",
            }}
          />
          <p>コーヒーメーカー</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(4) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(4)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/05_缶つま.jpg"
            alt="Image05"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "65%",
              height: "auto",
            }}
          />
          <p>缶つま</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(5) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(5)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/06_朝日山 天籟 越淡麗 純米大吟醸.jpg"
            alt="Image06"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "65%",
              height: "auto",
            }}
          />
          <p>朝日山 天籟 越淡麗 純米大吟醸</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(6) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(6)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/07_折りたたみ自転車.jpg"
            alt="Image07"
            width={500}
            height={500}
            sizes="90vw"
            style={{
              width: "83%",
              height: "auto",
            }}
          />
          <p>折りたたみ自転車</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(7) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(7)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/08_焼肉プレート.jpg"
            alt="Image08"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "88%",
              height: "auto",
            }}
          />
          <p>焼肉プレート.jpg</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(8) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(8)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
      </div>

      {/*10000円以下の景品 */}
      <div className={styles.grid_02}>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/09_ジバニャン着ぐるみ.jpg"
            alt="Image09"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "34%",
              height: "auto",
            }}
          />
          <p>ジバニャン着ぐるみ</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(9) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(9)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/10_チュッパチャプス200本ツリー.jpg"
            alt="Image10"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "41%",
              height: "auto",
            }}
          />
          <p>
            チュッパチャプス
            <br />
            200本ツリー
          </p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(10) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(10)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/11_技大セット.jpg"
            alt="Image11"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "167%",
              height: "auto",
            }}
          />
          <p>技大セット</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(11) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(11)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/12_瓶コーラ12本セット.jpg"
            alt="Image12"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "88%",
              height: "auto",
            }}
          />
          <p>瓶コーラ12本セット</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(12) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(12)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/13_魚沼産コシヒカリ(2kg).jpg"
            alt="Image13"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "53%",
              height: "auto",
            }}
          />
          <p>魚沼産コシヒカリ(2kg)</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(13) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(13)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/14_着る毛布(サメ).jpg"
            alt="Image14"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "45%",
              height: "auto",
            }}
          />
          <p>着る毛布(サメ)</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(14) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(14)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/15_駄菓子 詰め合わせセット.jpg"
            alt="Image15"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "84%",
              height: "auto",
            }}
          />
          <p>
            駄菓子
            <br />
            詰め合わせセット
          </p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(15) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(15)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/16_トトロクッション.jpg"
            alt="Image16"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "53%",
              height: "auto",
            }}
          />
          <p>トトロクッション</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(16) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(16)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/17_ハンディファン.jpg"
            alt="Image17"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "61%",
              height: "auto",
            }}
          />
          <p>ハンディファン</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(17) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(17)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/18_サウナハット.jpg"
            alt="Image18"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "56%",
              height: "auto",
            }}
          />
          <p>サウナハット</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(18) ? styles.selected : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(18)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/19_ご飯が炊ける弁当箱.jpg"
            alt="Image19"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "72%",
              height: "auto",
            }}
          />
          <p>ご飯が炊ける弁当箱</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(19)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(19)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/20_人生ゲームゴールデンドリーム.jpg"
            alt="Image20"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "112%",
              height: "auto",
            }}
          />
          <p>
            人生ゲーム
            <br />
            ゴールデンドリーム
          </p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(20)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(20)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/21_寝袋.jpg"
            alt="Image21"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "64%",
              height: "auto",
            }}
          />
          <p>寝袋</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(21)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(21)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/22_ソーダストリーム.jpg"
            alt="Image22"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "38%",
              height: "auto",
            }}
          />
          <p>ソーダストリーム</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(22)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(22)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/23_ナブラ演算子ゲーム.jpg"
            alt="Image23"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "153%",
              height: "auto",
            }}
          />
          <p>ナブラ演算子ゲーム</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(23)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(23)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/24_ダンベル.jpg"
            alt="Image24"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "99%",
              height: "auto",
            }}
          />
          <p>ダンベル</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(24)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(24)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/25_ニュートンのゆりかご.jpg"
            alt="Image25"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "83%",
              height: "auto",
            }}
          />
          <p>ニュートンのゆりかご</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(25)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(25)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/26_日めくりカレンダー(毎日アンミカ）.jpg"
            alt="Image26"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "51%",
              height: "auto",
            }}
          />
          <p>
            日めくりカレンダー
            <br />
            &#40;毎日アンミカ&#41;
          </p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(26)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(26)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/27_セクシー大根抱き枕.jpg"
            alt="Image27"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "67%",
              height: "auto",
            }}
          />
          <p>セクシー大根抱き枕</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(27)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(27)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/28_ペッパーミル.jpg"
            alt="Image28"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "91%",
              height: "auto",
            }}
          />
          <p>ペッパーミル</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(28)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(28)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/29_ザコシショウ来学記念セット.jpg"
            alt="Image29"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "92%",
              height: "auto",
            }}
          />
          <p>
            ザコシショウ
            <br />
            来学記念セット
          </p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(29)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(29)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/30_巨大クマのぬいぐるみ.jpg"
            alt="Image30"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "87%",
              height: "auto",
            }}
          />
          <p>巨大クマのぬいぐるみ</p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(30)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(30)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/31_ハーゲンダッツ詰め合わせ.jpg"
            alt="Image31"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "56%",
              height: "auto",
            }}
          />
          <p>
            ハーゲンダッツ
            <br />
            詰め合わせ
          </p>
          <div
            className={`${styles.toggle_button} ${
              selectedNumbers.includes(31)
                ? styles.selected
                : ""
            }`}
          >
            <input
              id="toggle"
              className={styles.toggle_input}
              type="checkbox"
              checked={selectedNumbers.length === 31}
              onClick={() => toggleNumber(31)}
            />
            <label htmlFor="toggle" className={styles.toggle_label} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
