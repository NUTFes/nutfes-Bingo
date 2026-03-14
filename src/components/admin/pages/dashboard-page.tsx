"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CgLogOut } from "react-icons/cg";
import { ToastContainer, toast } from "react-toastify";

import {
  createNumber as createNumberAction,
  decrementReach as decrementReachAction,
  deleteNumber as deleteNumberAction,
  incrementReach as incrementReachAction,
  saveSurveyState as saveSurveyStateAction,
  updateNumber as updateNumberAction,
} from "@/app/admin/actions";
import { logout as logoutAction } from "@/app/auth/actions";
import { useNumbers } from "@/lib/bingo/client";
import type { AppStateRow, NumberRow } from "@/lib/bingo/types";
import { BingoResult, Header, JudgementModal, UpdateNumberModal } from "@/components/admin/common";
import {
  AdminButton,
  AdminInput,
  AdminPageContent,
  AdminPageShell,
  AdminPanel,
  AdminSelect,
} from "@/components/admin/ui";

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
      await createNumberAction(nextNumber);
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
      await deleteNumberAction(target);
      setDeleteInput("");
      setSelectedDeleteNumber("");
    } catch (error) {
      console.error(error);
      toast.error("番号の削除に失敗しました。");
    }
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  const handleSurvey = async (isSurveyActive: boolean) => {
    try {
      await saveSurveyStateAction({ surveyUrl, isSurveyActive });
      toast.success(isSurveyActive ? "アンケートを送信しました。" : "アンケートを停止しました。");
    } catch (error) {
      console.error(error);
      toast.error("アンケート設定の更新に失敗しました。");
    }
  };

  return (
    <AdminPageShell>
      <ToastContainer position="top-center" />
      <JudgementModal isOpened={isOpened} setIsOpened={setIsOpened} bingoNumbers={bingoNumbers} />
      <UpdateNumberModal
        isOpened={isOpenUpdateNumberModal}
        setIsOpened={setIsOpenUpdateNumberModal}
        id={selectedId}
        initialNumber={selectedNumber}
        onSubmit={async ({ id, number }) => {
          await updateNumberAction(id, number);
          toast.success("番号を更新しました。");
        }}
      />
      <Header user="Admin">
        <AdminButton rounded="pill" onClick={() => router.push("/admin/prizes/new")}>
          景品追加
        </AdminButton>
        <AdminButton rounded="pill" onClick={() => router.push("/admin/prizes")}>
          景品管理
        </AdminButton>
        <AdminButton rounded="pill" onClick={() => setIsOpened(true)}>
          ビンゴ正誤判定
        </AdminButton>
        <AdminButton rounded="pill" onClick={handleLogout}>
          <CgLogOut className="size-5" />
          ログアウト
        </AdminButton>
      </Header>

      <AdminPageContent className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminPanel
          title="抽選した番号を入力"
          description="1〜99の番号を入力して抽選結果に追加します。"
        >
          <div className="flex flex-wrap items-end gap-4 max-sm:flex-col max-sm:items-stretch">
            <AdminInput
              type="number"
              min={1}
              max={99}
              placeholder="番号を入力"
              className="w-full max-w-md"
              value={submitNumber}
              onChange={(event) => setSubmitNumber(event.target.value)}
            />
            <AdminButton
              disabled={!submitNumber}
              className="min-w-36"
              onClick={() => void handleCreate()}
            >
              送信
            </AdminButton>
          </div>
        </AdminPanel>

        <AdminPanel
          title="抽選した番号を削除"
          description="手入力または一覧選択で抽選済み番号を取り消します。"
        >
          <div className="flex flex-wrap items-end gap-4 max-sm:flex-col max-sm:items-stretch">
            <AdminInput
              type="number"
              min={1}
              max={99}
              placeholder="番号を入力"
              className="w-full max-w-md"
              value={deleteInput}
              onChange={(event) => setDeleteInput(event.target.value)}
            />
            <AdminSelect
              value={selectedDeleteNumber}
              className="w-full max-w-60"
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
            </AdminSelect>
            <AdminButton
              disabled={!deleteInput && !selectedDeleteNumber}
              className="min-w-36"
              onClick={() => void handleDelete()}
            >
              送信
            </AdminButton>
          </div>
        </AdminPanel>

        <AdminPanel
          className="lg:col-span-2"
          title="リーチ数の制御"
          description="現在のリーチ数を1ずつ増減します。"
        >
          <div className="flex flex-wrap gap-4 max-sm:flex-col">
            <AdminButton
              className="max-sm:w-full"
              onClick={async () => {
                try {
                  await incrementReachAction();
                } catch (error) {
                  console.error(error);
                  toast.error("リーチ数の増加に失敗しました。");
                }
              }}
            >
              リーチ数を 1 増加する
            </AdminButton>
            <AdminButton
              className="max-sm:w-full"
              onClick={async () => {
                try {
                  await decrementReachAction();
                } catch (error) {
                  console.error(error);
                  toast.error("リーチ数の減少に失敗しました。");
                }
              }}
            >
              リーチ数を 1 減少する
            </AdminButton>
          </div>
        </AdminPanel>

        <AdminPanel
          className="lg:col-span-2"
          title="アンケートURLと配信制御"
          description="URL設定後に配信開始/停止を選択してください"
        >
          <div className="space-y-4">
            <AdminInput
              type="url"
              placeholder="https://forms.gle/..."
              className="w-full"
              value={surveyUrl}
              onChange={(event) => setSurveyUrl(event.target.value)}
            />
            <div className="flex flex-wrap gap-4 max-sm:flex-col">
              <AdminButton className="max-sm:w-full" onClick={() => void handleSurvey(true)}>
                配信する
              </AdminButton>
              <AdminButton className="max-sm:w-full" onClick={() => void handleSurvey(false)}>
                配信を停止する
              </AdminButton>
            </div>
          </div>
        </AdminPanel>
      </AdminPageContent>

      <AdminPageContent className="mt-6">
        <BingoResult bingoResultNumber={bingoNumbers} onClick={handleNumberClick} />
      </AdminPageContent>
    </AdminPageShell>
  );
}
