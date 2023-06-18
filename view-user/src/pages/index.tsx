import Head from "next/head";
import Image from "next/image";
import styles from "@/styles/Home.module.css";
import type { NextPage } from "next";


const Page: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Bingo</title>
        <meta name="description" content="NUTFES BINGO" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <div>
        <p className={styles.text}>Hello World</p>
      </div>
    </div>
  );
};

export default Page;
