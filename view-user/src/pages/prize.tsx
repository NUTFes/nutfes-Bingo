import type { NextPage } from "next";
import Link from "next/link";
import Image from "next/image";
import styles from "@/styles/prize.module.css";
import { Header, Button } from "@/components/common";

const Page: NextPage = () => {
  return (
    <div className={styles.container}>
      <Header user="">
        <div className={styles.main}>
          <Button size="m" shape="circle">
            <div className={styles.buttonContents}>
              <Image
                src="/BingoCard.svg"
                alt="BingoCard"
                width={25}
                height={25}
              />
              <Link className={styles.link} href="/">
                Number List
              </Link>
            </div>
          </Button>
        </div>
      </Header>
      <div className={styles.title}>
        <Image src="/GiftBox.svg" alt="PresentBox" width={19} height={19} />
        <p>景品 List</p>
      </div>

      {/* 10000円以上の景品 */}
      <div className={styles.grid_01}>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/01_Apple Watch SE.jpg"
            alt="Image01"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "65%",
              height: "auto",
            }}
          />
          <p>Apple Watch</p>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/02_黒毛和牛1kg.jpg"
            alt="Image02"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "55%",
              height: "auto",
            }}
          />
          <p>黒毛和牛1kg</p>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/03_選べるペアチケット.jpg"
            alt="Image03"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "80%",
              height: "auto",
            }}
          />
          <p>選べるペアチケット</p>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/04_コーヒーメーカー.jpg"
            alt="Image04"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "50%",
              height: "auto",
            }}
          />
          <p>コーヒーメーカー</p>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/05_缶つま.jpg"
            alt="Image05"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "73%",
              height: "auto",
            }}
          />
          <p>缶つま</p>
        </div>
        <div className={styles.item_01}>
          <Image
            src="/PrizeItem/06_朝日山 天籟 越淡麗 純米大吟醸.jpg"
            alt="Image06"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "73%",
              height: "auto",
            }}
          />
          <p>朝日山 天籟 越淡麗 純米大吟醸</p>
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
              width: "30%",
              height: "auto",
            }}
          />
          <p>ジバニャン着ぐるみ</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/10_チュッパチャプス200本ツリー.jpg"
            alt="Image10"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "45%",
              height: "auto",
            }}
          />
          <p>
            チュッパチャプス
            <br />
            200本ツリー
          </p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/11_技大セット.jpg"
            alt="Image11"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "80%",
              height: "auto",
            }}
          />
          <p>技大セット</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/12_瓶コーラ12本セット.jpg"
            alt="Image12"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>瓶コーラ12本セット</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/13_魚沼産コシヒカリ(2kg).jpg"
            alt="Image13"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>魚沼産コシヒカリ(2kg)</p>
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
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/15_駄菓子 詰め合わせセット.jpg"
            alt="Image15"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "50%",
              height: "auto",
            }}
          />
          <p>
            駄菓子
            <br />
            詰め合わせセット
          </p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/16_トトロクッション.jpg"
            alt="Image16"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>トトロクッション</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/17_ハンディファン.jpg"
            alt="Image17"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "47%",
              height: "auto",
            }}
          />
          <p>ハンディファン</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/18_サウナハット.jpg"
            alt="Image18"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>サウナハット</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/19_ご飯が炊ける弁当箱.jpg"
            alt="Image19"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>ご飯が炊ける弁当箱</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/20_人生ゲームゴールデンドリーム.jpg"
            alt="Image20"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "75%",
              height: "auto",
            }}
          />
          <p>
            人生ゲーム
            <br />
            ゴールデンドリーム
          </p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/21_寝袋.jpg"
            alt="Image21"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>寝袋</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/22_ソーダストリーム.jpg"
            alt="Image22"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "39%",
              height: "auto",
            }}
          />
          <p>ソーダストリーム</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/23_ナブラ演算子ゲーム.jpg"
            alt="Image23"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "85%",
              height: "auto",
            }}
          />
          <p>ナブラ演算子ゲーム</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/24_ダンベル.jpg"
            alt="Image24"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>ダンベル</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/25_ニュートンのゆりかご.jpg"
            alt="Image25"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>ニュートンのゆりかご</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/26_日めくりカレンダー(毎日アンミカ）.jpg"
            alt="Image26"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "37%",
              height: "auto",
            }}
          />
          <p>
            日めくりカレンダー
            <br />
            &#40;毎日アンミカ&#41;
          </p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/27_セクシー大根抱き枕.jpg"
            alt="Image27"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "52%",
              height: "auto",
            }}
          />
          <p>セクシー大根抱き枕</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/28_ペッパーミル.jpg"
            alt="Image28"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "52%",
              height: "auto",
            }}
          />
          <p>ペッパーミル</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/29_ザコシショウ来学記念セット.jpg"
            alt="Image29"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "80%",
              height: "auto",
            }}
          />
          <p>
            ザコシショウ
            <br />
            来学記念セット
          </p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/30_巨大クマのぬいぐるみ.jpg"
            alt="Image30"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>巨大クマのぬいぐるみ</p>
        </div>
        <div className={styles.item_02}>
          <Image
            src="/PrizeItem/31_ハーゲンダッツ詰め合わせ.jpg"
            alt="Image31"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: "60%",
              height: "auto",
            }}
          />
          <p>
            ハーゲンダッツ
            <br />
            詰め合わせ
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;
