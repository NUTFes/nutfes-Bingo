import Image from "next/image";
import styles from "@/styles/Home.module.css";
import Head from "next/head";
import type { NextPage } from "next";
import { Header, Button } from "@/components/common";
import { CgLogOut } from "react-icons/cg";

const Page: NextPage = () => {
  return (
    <div className={styles.container}>
      <div>
        <Header user="USER" />
      </div>
      <Button size="l" shape="circle">
        <div className={styles.contents}>
          <CgLogOut className={styles.icon} />
          <p>Logout</p>
        </div>
      </Button>
    </div>
  );
};

export default Page;
