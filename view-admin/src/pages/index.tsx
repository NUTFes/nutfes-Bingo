import styles from "@/styles/Home.module.css";
import type { NextPage } from "next";
import { Header, BingoResult, Button } from "@/components/common";
import { CgLogOut } from "react-icons/cg";
import { useState } from "react";

const Page: NextPage = () => {
  const bingoResultNumber: number[] = [
    21, 5, 33, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 55,
    66, 32,
  ];
  const [data, setData] = useState("");
  const [inputNumber, setInputNumber] = useState<number | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const handleSelectChange = (event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(event.target.value);
    setSelectedNumber(isNaN(newValue) ? null : newValue);
  };

  const handleSubmit = () => {
    if (inputNumber !== null) {
      console.log(inputNumber);
    } else if (selectedNumber !== null) {
      console.log(selectedNumber);
    }
    setInputNumber(null);
    setSelectedNumber(null);
  };

  return (
    <div className={styles.container}>
      <Header user="Admin">
        <div className={styles.main}>
          <Button size="l" shape="circle">
            <CgLogOut className={styles.buttonIcon} />
            <p>Logout</p>
          </Button>
        </div>
      </Header>
      <div className={styles.form}>
        <div className={styles.frame}>
          <p>抽選した番号を入力</p>
          <form className={styles.item}>
            <input
              type="number"
              min="0"
              max="99"
              name="data"
              placeholder="番号を入力"
              value={data}
              onChange={(event) => setData(event.target.value)}
              className={styles.inputForm}
            />
            <button
              type="button"
              className={styles.Button}
              onClick={() => {
                console.log(data);
                setData("");
              }}
            >
              送信
            </button>
          </form>
        </div>
        <div className={styles.frame}>
          <p className={styles.centerText}>抽選した番号を削除</p>
          <form className={styles.item}>
            <input
              type="number"
              min="0"
              max="99"
              name="data"
              placeholder="番号を入力"
              value={selectedNumber !== null ? selectedNumber : ""}
              onChange={handleSelectChange}
              className={styles.inputForm}
            />
            <select
              value={
                inputNumber !== null
                  ? ""
                  : selectedNumber !== null
                  ? selectedNumber
                  : ""
              }
              onChange={handleSelectChange}
              disabled={inputNumber !== null}
            >
              <option value="" hidden>
                選択してください
              </option>
              {bingoResultNumber.map((number, index) => (
                <option key={index} value={number}>
                  {number}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.Button}
              onClick={handleSubmit}
              disabled={inputNumber === null && selectedNumber === null}
            >
              送信
            </button>
          </form>
        </div>
      </div>
      <BingoResult bingoResultNumber={bingoResultNumber} />
    </div>
  );
};

export default Page;
