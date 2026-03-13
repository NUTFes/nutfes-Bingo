"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CgLogOut } from "react-icons/cg";
import { ToastContainer, toast } from "react-toastify";

import {
  createNumber,
  decrementReach,
  deleteNumber,
  saveSurveyState,
  updateNumber,
  useNumbers,
  incrementReach,
} from "@/lib/bingo/client";
import type { AppStateRow, NumberRow } from "@/lib/bingo/types";
import { createClient } from "@/lib/supabase/client";
import {
  BingoResult,
  Button,
  Header,
  JudgementModal,
  UpdateNumberModal,
} from "@/components/admin/common";
import styles from "@/styles/admin/Home.module.css";

interface DashboardPageProps {
  initialNumbers: NumberRow[];
  initialAppState: AppStateRow;
}

export function DashboardPage({ initialNumbers, initialAppState }: DashboardPageProps) {
  const router = useRouter();
  const bingoNumbers = useNumbers(initialNumbers);
  const [isOpened, setIsOpened] = useState(false);
  const [isOpenUpdateNumberModal, setIsOpenUpdateNumberModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [selectedNumber, setSelectedNumber] = useState<number>(0);
  const [submitNumber, setSubmitNumber] = useState("");
  const [deleteInput, setDeleteInput] = useState("");
  const [selectedDeleteNumber, setSelectedDeleteNumber] = useState("");
  const [surveyUrl, setSurveyUrl] = useState(initialAppState.survey_url);

  const handleNumberClick = (id: number) => {
    const target = bingoNumbers.find((number) => number.id === id);
    setSelectedId(id);
    setSelectedNumber(target?.number ?? 0);
    setIsOpenUpdateNumberModal(true);
  };

  const handleCreate = async () => {
    const nextNumber = Number(submitNumber);
    if (Number.isNaN(nextNumber) || nextNumber < 1 || nextNumber > 99) {
      return;
    }

    try {
      await createNumber(nextNumber);
      setSubmitNumber("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "番号の登録に失敗しました";
      if (message.includes("duplicate") || message.includes("numbers_number_unique")) {
        toast.warning(`${nextNumber} は既に入力済みです。`);
      } else {
        toast.error("番号の登録に失敗しました。");
      }
    }
  };

  const handleDelete = async () => {
    const target = deleteInput ? Number(deleteInput) : Number(selectedDeleteNumber);
    if (Number.isNaN(target) || target < 1 || target > 99) {
      return;
    }

    try {
      await deleteNumber(target);
      setDeleteInput("");
      setSelectedDeleteNumber("");
    } catch (error) {
      console.error(error);
      toast.error("番号の削除に失敗しました。");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleSurvey = async (isSurveyActive: boolean) => {
    try {
      await saveSurveyState({ surveyUrl, isSurveyActive });
      toast.success(isSurveyActive ? "アンケートを送信しました。" : "アンケートを停止しました。");
    } catch (error) {
      console.error(error);
      toast.error("アンケート設定の更新に失敗しました。");
    }
  };

  return (
    <div className={styles.container}>
      <ToastContainer position="top-center" />
      <JudgementModal isOpened={isOpened} setIsOpened={setIsOpened} bingoNumbers={bingoNumbers} />
      <UpdateNumberModal
        isOpened={isOpenUpdateNumberModal}
        setIsOpened={setIsOpenUpdateNumberModal}
        id={selectedId}
        initialNumber={selectedNumber}
        onSubmit={async ({ id, number }) => {
          await updateNumber(id, number);
          toast.success("番号を更新しました。");
        }}
      />
      <Header user="Admin">
        <div className={styles.main}>
          <Button size="m" shape="circle" onClick={() => router.push("/admin/prizes/new")}>
            <p>景品追加</p>
          </Button>
          <Button size="m" shape="circle" onClick={() => router.push("/admin/prizes")}>
            <p>景品管理</p>
          </Button>
          <Button size="m" shape="circle" onClick={() => setIsOpened(true)}>
            <p>ビンゴ正誤判定</p>
          </Button>
          <Button size="m" shape="circle" onClick={handleLogout}>
            <CgLogOut className={styles.buttonIcon} />
            <p>ログアウト</p>
          </Button>
        </div>
      </Header>
      <div className={styles.form}>
        <div className={styles.frame}>
          <p>抽選した番号を入力</p>
          <div className={styles.item}>
            <div className={styles.flexerror}>
              <input
                type="number"
                min={1}
                max={99}
                placeholder="番号を入力"
                className={styles.inputForm}
                value={submitNumber}
                onChange={(event) => setSubmitNumber(event.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={!submitNumber}
              className={styles.Button}
              onClick={() => void handleCreate()}
            >
              送信
            </button>
          </div>
        </div>
        <div className={styles.frame}>
          <p className={styles.centerText}>抽選した番号を削除</p>
          <div className={styles.item}>
            <div className={styles.flexerror}>
              <input
                type="number"
                min={1}
                max={99}
                placeholder="番号を入力"
                className={styles.inputForm}
                value={deleteInput}
                onChange={(event) => setDeleteInput(event.target.value)}
              />
            </div>
            <select
              value={selectedDeleteNumber}
              onChange={(event) => {
                setSelectedDeleteNumber(event.target.value);
                setDeleteInput("");
              }}
            >
              <option value="" hidden>
                選択してください
              </option>
              {[...bingoNumbers].reverse().map((bingoNumber) => (
                <option key={bingoNumber.id} value={bingoNumber.number}>
                  {bingoNumber.number}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!deleteInput && !selectedDeleteNumber}
              className={styles.Button}
              onClick={() => void handleDelete()}
            >
              送信
            </button>
          </div>
        </div>
        <div className={styles.frame}>
          <div className={styles.item}>
            <button type="button" className={styles.Button} onClick={() => void incrementReach()}>
              リーチ数を 1 増加する
            </button>
            <button type="button" className={styles.Button} onClick={() => void decrementReach()}>
              リーチ数を 1 減少する
            </button>
          </div>
        </div>
        <div className={styles.frame}>
          <p>アンケートURLと配信制御</p>
          <div className={`${styles.item} ${styles.surveyRow}`}>
            <div className={styles.flexerror}>
              <input
                type="url"
                placeholder="https://forms.gle/..."
                className={styles.inputForm}
                value={surveyUrl}
                onChange={(event) => setSurveyUrl(event.target.value)}
              />
            </div>
          </div>
          <div className={`${styles.item} ${styles.surveyRow}`}>
            <div className={styles.surveyButtons}>
              <button
                type="button"
                className={styles.Button}
                onClick={() => void handleSurvey(true)}
              >
                配信する
              </button>
              <button
                type="button"
                className={styles.Button}
                onClick={() => void handleSurvey(false)}
              >
                配信を停止する
              </button>
            </div>
          </div>
        </div>
      </div>
      <BingoResult bingoResultNumber={bingoNumbers} onClick={handleNumberClick} />
    </div>
  );
}
