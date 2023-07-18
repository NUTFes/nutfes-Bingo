import Image from "next/image";
import styles from "@/styles/Home.module.css";
import Head from "next/head";
import type { NextPage } from "next";
import { Header } from "@/components/common";
import { BingoResult } from "@/components/common";

const Page: NextPage = () => {
  const dataArray:number[] = [21, 5, 33333]
  return (
  <div className={styles.container}>
    <div>
      <Header user="USER" />
    </div>
    <div>
      {/* 数字は適当 */}
      <BingoResult dataArray={dataArray}/>
    </div>
  </div>
  )
};

export default Page;
