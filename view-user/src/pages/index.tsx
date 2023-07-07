import Image from "next/image";
import styles from "@/styles/Home.module.css";
import Head from "next/head";
import type { NextPage } from "next";
import { Header } from "@/components/common";

const Page: NextPage = () => {
  return (
  <div className={styles.container}>
    <Head>
      <title>Bingo</title>
      <meta name="description" content="NUTFES BINGO" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.svg" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap" rel="stylesheet"></link>
    </Head>
    <div>
      <Header user="USER" />
    </div>
  </div>
  )
};

export default Page;
