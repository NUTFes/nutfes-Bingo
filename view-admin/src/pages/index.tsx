import { useMutation, useSubscription } from "@apollo/client";
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
  CreateOneNumberDocument,
  DeleteOneNumberDocument,
  SubscribeListNumbersDocument,
} from "@/type/graphql";
import type { SubscribeListNumbersSubscription } from "@/type/graphql";

interface formDataCreate {
  submitNumber: number | null;
}

interface formDataDelete {
  inputedNumber: number | null;
  selectedNumber: number | null;
}

const Page: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();

  // prettier-ignore
  const [bingoNumbers, setBingoNumbers] = useState<SubscribeListNumbersSubscription["numbers"]>([]);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const isopenBool = () => setIsOpened(!isOpened);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    getValues: getValuesCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate, isValid: isValidCreateSubmit },
  } = useForm<formDataCreate>({
    mode: "onChange",
  });

  const {
    register: registerDelete,
    handleSubmit: handleSubmitDelete,
    getValues: getValuesDelete,
    reset: resetDelete,
    formState: { errors: errorsDelete, isValid: isValidCreateDelete },
  } = useForm<formDataDelete>({
    mode: "onChange",
  });
  // prettier-ignore
  const { data, loading, error } = useSubscription(SubscribeListNumbersDocument);
  const [createNumber] = useMutation(CreateOneNumberDocument);
  const [deleteNumber] = useMutation(DeleteOneNumberDocument);

  //番号の追加
  const onSubmitCreate: SubmitHandler<formDataCreate> = () => {
    const { submitNumber } = getValuesCreate();
    if (submitNumber !== null) {
      createNumber({ variables: { number: submitNumber } });
      resetCreate({ submitNumber: null });
    }
  };

  //番号の削除
  const onSubmitDelete = () => {
    const { inputedNumber, selectedNumber } = getValuesDelete();
    if (inputedNumber) {
      deleteNumber({ variables: { number: inputedNumber } });
      resetDelete({ inputedNumber: null });
    } else if (selectedNumber) {
      deleteNumber({ variables: { number: selectedNumber } });
      resetDelete({ selectedNumber: null });
    }
  };

  //subscriptionを行うためのuseEffect
  useEffect(() => {
    if (data) {
      setBingoNumbers(data.numbers);
    }
  }, [data]);

  // if (session) {
  return (
    <div className={styles.container}>
      <JudgementModal
        isOpened={isOpened}
        setIsOpened={setIsOpened}
        bingoNumbers={bingoNumbers}
      />
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
          <form onSubmit={handleSubmitCreate(onSubmitCreate)}>
            <div className={styles.item}>
              <div className={styles.flexerror}>
                <input
                  type="number"
                  placeholder="番号を入力"
                  className={styles.inputForm}
                  {...registerCreate("submitNumber", {
                    valueAsNumber: true,
                    max: 99,
                    min: 1,
                  })}
                />
                {errorsCreate.submitNumber && (
                  <div className={styles.errormessage}>
                    1~99の番号を入力してください
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!isValidCreateSubmit}
                className={
                  errorsCreate.submitNumber
                    ? styles.not_hover_Button
                    : styles.Button
                }
              >
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
                type="number"
                placeholder="番号を入力"
                className={styles.inputForm}
                {...registerDelete("inputedNumber", {
                  max: 99,
                  min: 1,
                })}
              />
              {(errorsDelete.inputedNumber || errorsDelete.selectedNumber) && (
                <div className={styles.errormessage}>
                  1~99の番号を入力してください
                </div>
              )}
            </div>
            <select
              {...registerDelete("selectedNumber")}
              onChange={() => resetDelete({ inputedNumber: null })}
            >
              <option value="" hidden>
                選択してください
              </option>
              {[...bingoNumbers].reverse().map((bingoNumber, index) => (
                <option key={index} value={bingoNumber.number}>
                  {bingoNumber.number}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!isValidCreateDelete}
              className={
                errorsDelete.inputedNumber || errorsDelete.selectedNumber
                  ? styles.not_hover_Button
                  : styles.Button
              }
              onClick={handleSubmitDelete(onSubmitDelete)}
            >
              送信
            </button>
          </div>
        </div>
      </div>
      <BingoResult bingoResultNumber={bingoNumbers} />
    </div>
  );
};

//   return (
//     <div className={styles.loginContainer}>
//       <Header user="Admin Login">
//         <div className={styles.main}></div>
//       </Header>
//       <div className={styles.loginButton}>
//         <Button size="l" shape="square" onClick={() => signIn()}>
//           Log in
//         </Button>
//       </div>
//     </div>
//   );
// };

export default Page;
