import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useForm, SubmitHandler } from "react-hook-form";
import styles from "@/styles/Home.module.css";
import type { NextPage } from "next";
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

interface formData {
  submitNumber: number | null;
  inputedNumber: number | null;
  selectedNumber: number | null;
}

const Page: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const isopenBool = () => setIsOpened(!isOpened);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<formData>();

  const handleSubmitCreate: SubmitHandler<formData> = () => {
    const { submitNumber } = getValues();
    createMethod(submitNumber);
  };

  const handleSubmitDelete = async () => {
    const { inputedNumber, selectedNumber } = getValues();
    if (inputedNumber) {
      deleteMethod(inputedNumber);
      reset({ inputedNumber: null });
    } else if (selectedNumber) {
      deleteMethod(selectedNumber);
      reset({ selectedNumber: null });
    }
  };

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

  async function createMethod(data: number | null) {
    if (data != null) {
      const newBingoNumber = await createBingoNumber(data);
      reset({ submitNumber: null });
      if (newBingoNumber) {
        console.log("Bingo number created:", newBingoNumber);
      } else {
        console.error("Failed to create bingo number.");
      }
    }
  }

  async function deleteMethod(data: number) {
    const deletedBingoNumber = await deleteBingoNumber(data);
    reset();
    if (deletedBingoNumber) {
      console.log("Bingo number deleted:", deletedBingoNumber);
    } else {
      console.error("Failed to delete bingo number.");
    }
  }

  if (session) {
    return (
      <div className={styles.container}>
        <JudgementModal isOpened={isOpened} setIsOpened={setIsOpened} />
        <Header user="Admin">
          <div className={styles.main}>
            <Button
              size="m"
              shape="circle"
              onClick={() => router.push("/postPrizes")}
            >
              <p>景品追加</p>
            </Button>
            <Button
              size="m"
              shape="circle"
              onClick={() => router.push("/prizes")}
            >
              <p>景品管理</p>
            </Button>
            <Button size="m" shape="circle" onClick={isopenBool}>
              <p>ビンゴ正誤判定</p>
            </Button>
            <Button
              size="m"
              shape="circle"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <CgLogOut className={styles.buttonIcon} />
              <p>ログアウト</p>
            </Button>
          </div>
        </Header>
        <div className={styles.form}>
          <div className={styles.frame}>
            <p>抽選した番号を入力</p>
            <form onSubmit={handleSubmit(handleSubmitCreate)}>
              <div className={styles.item}>
                <div className={styles.flexerror}>
                  <input
                    {...register("submitNumber", {
                      max: 99,
                      min: 1,
                    })}
                    type="number"
                    placeholder="番号を入力"
                    className={styles.inputForm}
                  />
                  {errors.submitNumber && (
                    <div className={styles.errormessage}>
                      1~99の番号を入力してください
                    </div>
                  )}
                </div>
                <button type="submit" className={styles.Button}>
                  送信
                </button>
              </div>
            </form>
          </div>
          <div className={styles.frame}>
            <p className={styles.centerText}>抽選した番号を削除</p>
            <div className={styles.item}>
              <div className={styles.flexerror}>
                <input
                  {...register("inputedNumber", {
                    max: 99,
                    min: 1,
                  })}
                  type="number"
                  placeholder="番号を入力"
                  className={styles.inputForm}
                  onChange={() => reset({ selectedNumber: null })}
                />
                {(errors.inputedNumber || errors.selectedNumber) && (
                  <div className={styles.errormessage}>
                    1~99の番号を入力してください
                  </div>
                )}
              </div>
              <select
                {...register("selectedNumber")}
                onChange={() => reset({ inputedNumber: null })}
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
                onClick={handleSubmitDelete}
              >
                送信
              </button>
            </div>
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
        <Button size="l" shape="square" onClick={() => signIn()}>
          Log in
        </Button>
      </div>
    </div>
  );
};

export default Page;
