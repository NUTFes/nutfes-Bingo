import React, { useEffect, useState } from "react";
import { getBingoNumber, BingoNumber } from "@/utils/api_methods";
import type { NextPage } from "next";
import styles from "@/styles/Home.module.css";
import { Header, Modal, BingoResult } from "@/components/common";

const Page: NextPage = () => {
  const [isOpened, setIsOpened] = useState(false);
  const isopenBool = () => setIsOpened(!isOpened);
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);

  useEffect(() => {
    async function fetchBingoNumbers() {
      try {
        const response: BingoNumber[] = await getBingoNumber();
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
        <p>25</p>
      </Modal>
      <Header user="">
        <div className={styles.main}>
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
