import Image from "next/image";
import styles from "@/styles/Home.module.css";
import Head from "next/head";
import type { NextPage } from "next";
import { Header,Button } from "@/components/common";


const Page: NextPage = () => {
  return (
  <div className={styles.container}>
    <div>
      <Header user="USER" />
    </div>
  </div>
  )
};

export default Page;
