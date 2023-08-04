import styles from "@/styles/Home.module.css";
import type { NextPage } from "next";
import { Header, BingoResult, Button } from "@/components/common";
import { CgLogOut } from "react-icons/cg";

const Page: NextPage = () => {
  const bingoResultNumber: number[] = [
    21, 5, 33, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 55,
    66, 32,
  ];

  return (
    <div className={styles.container}>
      <Header user="Admin">
        <div className={styles.main}>
          <Button size="l" shape="circle">
            <div className={styles.LoginButtonContents}>
              <CgLogOut className={styles.buttonIcon} />
              <p>Logout</p>
            </div>
          </Button>
        </div>
      </Header>
      <div className={styles.form}>
        <div className={styles.inputFrame}>
          <p>抽選した番号を入力</p>
          <form className={styles.item}>
            <input type="text" name="name" placeholder="番号を入力" className={styles.inputForm} />
            <button type="submit" className={styles.inputButton}>送信</button>
          </form>
        </div>
        <div className={styles.deleteFrame}>
          <p>抽選した番号を削除</p>
          <form className={styles.item}>
            <input type="text" name="name" placeholder="番号を入力" className={styles.inputForm} />
            <select>
              <option value="" hidden>選択してください</option>
              {bingoResultNumber.map((number, index) => (
                <option key={index} value={number}>{number}</option>
              ))}
            </select>
            <button type="submit" className={styles.deleteButton}>送信</button>
          </form>
        </div>
      </div>
      <BingoResult bingoResultNumber={bingoResultNumber} />
    </div>
  );
};

export default Page;

