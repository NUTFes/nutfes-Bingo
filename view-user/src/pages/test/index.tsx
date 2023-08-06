import type { NextPage } from "next";
import styles from "@/styles/Home.module.css";
import {
  TestBingoList,
  TestBingoCreate,
  TestBingoDelete,
} from "@/components/common";

const Page: NextPage = () => {
  return (
    <div className={styles.container}>
      <TestBingoList />
      <TestBingoCreate />
      <TestBingoDelete />
    </div>
  );
};

export default Page;
