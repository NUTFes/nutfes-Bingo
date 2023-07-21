import Image from "next/image";
import styles from "@/styles/Home.module.css";
import Head from "next/head";
import type { NextPage } from "next";
import { Header } from "@/components/common";
import { BingoResult } from "@/components/common";

const Page: NextPage = () => {
  const bingoResultNumber: number[] = [21, 5, 33, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4 ,55 ,66 ,32];
  return (
    <div className={styles.container}>
      <div>
        <Header user="USER" />
      </div>
      {/* 数字は適当 */}
      <BingoResult bingoResultNumber={bingoResultNumber} />
    </div>
  );
};

export default Page;
