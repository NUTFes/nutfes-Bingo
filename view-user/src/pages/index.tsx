import { useState } from "react";
import type { NextPage } from "next";
import styles from "@/styles/Home.module.css";
import { Header, Modal ,BingoResult } from "@/components/common";

const Page: NextPage = () => {
  const [isOpened, setIsOpened] = useState(false);
  const isopenBool = () => setIsOpened(!isOpened);
  const bingoResultNumber: number[] = [
    21, 5, 33, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 55,
    66, 32,
  ];

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
      <BingoResult bingoResultNumber={bingoResultNumber} />
    </div>
  )
  };

export default Page;
