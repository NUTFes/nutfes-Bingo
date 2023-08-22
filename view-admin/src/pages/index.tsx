import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import styles from "@/styles/Home.module.css";
import type { NextPage } from "next";
import Link from "next/link";
import {
  Header,
  BingoResult,
  Button,
  JudgementModal,
} from "@/components/common";
import { CgLogOut } from "react-icons/cg";
import { useEffect, useState } from "react";
import {
  BingoNumber,
  createBingoNumber,
  deleteBingoNumber,
  subscriptionBingoNumber,
} from "@/utils/api_methods";

const Page: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);
  const [data, setData] = useState<number | null>(null);
  const [inputNumber, setInputNumber] = useState<number | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const logoutClick = () => {
    signOut({ callbackUrl: "/" });
  };

  const [inputNumbers, setInputNumbers] = useState<number[]>([]);
  const [isIncluded, setIsIncluded] = useState(false);

  const checkInclusion = () => {
    if (inputNumbers.every(number => bingoNumbers.map(num => num.data).includes(number))) {
      setIsIncluded(true);
    }
  };

  const [isOpened, setIsOpened] = useState(false);
  const isopenBool = () => setIsOpened(!isOpened);

  useEffect(() => {
    async function fetchBingoNumbers() {
      try {
        const response: BingoNumber[] = await subscriptionBingoNumber();
        if (response) {
          setBingoNumbers(response);
        }
      } catch (error) {
        console.error("データの取得中にエラーが発生しました:", error);
      }
    }

    fetchBingoNumbers();
  }, [bingoNumbers]);

  const handleSelectChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newValue = parseInt(event.target.value);
    setSelectedNumber(isNaN(newValue) ? null : newValue);
  };

  async function createMethod(data: number | null) {
    if (data !== null) {
      const newBingoNumber = await createBingoNumber(data);
      if (newBingoNumber) {
        console.log("Bingo number created:", newBingoNumber);
      } else {
        console.error("Failed to create bingo number.");
      }
    } else {
      console.log("data is null");
    }
  }

  async function deleteMethod(data: number) {
    const BingoNumber = await deleteBingoNumber(data);
    if (BingoNumber) {
      console.log("Bingo number deleted:", BingoNumber);
    } else {
      console.error("Failed to delete bingo number.", Error);
    }
  }

  const handleSubmit = async () => {
    if (inputNumber !== null) {
      console.log(inputNumber);
      deleteMethod(inputNumber);
    } else if (selectedNumber !== null) {
      console.log(selectedNumber);
      deleteMethod(selectedNumber);
    }
    setInputNumber(null);
    setSelectedNumber(null);
  };

  if (session) {
    return (
      <div className={styles.container}>
        <JudgementModal
        isOpened={isOpened}
        isIncluded={isIncluded}
        setIsOpened={setIsOpened}
        setIsIncluded={setIsIncluded}
        setInputNumbers={setInputNumbers}
        checkInclusion={checkInclusion}
        />
        <Header user="Admin">
          <div className={styles.main}>
            <Button size="m" shape="circle">
              <div className={styles.buttonContents}>
                <Link className={styles.link} href="/testimage">
                  景品
                </Link>
              </div>
            </Button>
            <button type="button" onClick={isopenBool} className={styles.btnOpen}>
              ビンゴ正誤判定
            </button>
            <Button size="m" shape="circle" onClick={logoutClick}>
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
                value={data !== null ? data : ""}
                onChange={(event) => setData(event.target.valueAsNumber)}
                className={styles.inputForm}
              />
              <button
                type="button"
                className={styles.Button}
                onClick={async () => {
                  console.log(data);
                  await createMethod(data);
                  setData(null);
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
                {[...bingoNumbers].reverse().map((number, index) => (
                  <option key={index} value={number.data}>
                    {number.data}
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
        <BingoResult bingoResultNumber={bingoNumbers} />
      </div>
    );
  }
  return (
    <div className={styles.loginContainer}>
      <Header user="Admin Login">
        <div className={styles.main}></div>
      </Header>
      <div className={styles.loginButton}>
        <Button size="l" shape="square" onClick={() => signIn()}>Log in</Button>
      </div>
    </div>
  );
};

export default Page;
