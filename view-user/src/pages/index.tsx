import React, { useEffect, useState } from "react";
import { getBingoNumber, BingoNumber, subscriptionBingoNumber } from "@/utils/api_methods";
import type { NextPage } from "next";
import Image from "next/image";
import styles from "@/styles/Home.module.css";
import { Header, Modal, BingoResult, Button } from "@/components/common";
import { useRouter } from "next/router";

const Page: NextPage = () => {
  const [isOpened, setIsOpened] = useState(false);
  const router = useRouter();
  const isopenBool = () => setIsOpened(!isOpened);
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);

  useEffect(() => {
    async function fetchBingoNumbers() {
      try {
        const response: BingoNumber[] = await subscriptionBingoNumber();
        if (response) {
          setBingoNumbers(response);
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }

    fetchBingoNumbers();
  }, [bingoNumbers]);

  return (
    <div className={styles.container}>
      <Modal isOpened={isOpened} setisOpened={setIsOpened}>
        抽選された番号
        <p></p>
      </Modal>
      <Header user="">
        <div className={styles.main}>
        <Button size="m" shape="circle" onClick={() => router.push("./prize")}>
            <div className={styles.buttonContents}>
              <Image
                src="/GiftBox.svg"
                alt="GiftBox"
                width={19}
                height={19}
              />
              Prize
            </div>
          </Button>
          <button type="button" onClick={isopenBool} className={styles.btnOpen}>
            最新の番号を表示
          </button>
        </div>
      </Header>
      <BingoResult bingoResultNumber={bingoNumbers} />
    </div>
  );
};

export default Page;
