"use client";

import { AdminHeader, BingoResult } from "@/components/admin";
import { Button } from "@/components/ui/Button";
import { MyToastRegion, queue } from "@/components/ui/Toast";
import { useNumbersPolling } from "@/lib/polling";
import type { AppStateRow, NumberRow } from "@/types/bingo/types";
import JudgementModal from "./components/JudgementModal";
import UpdateNumberModal from "./components/UpdateNumberModal";
import { dashboardActions } from "./actions-client";
import {
  CreateNumberSection,
  DeleteNumberSection,
  ReachControlSection,
  SurveyControlSection,
} from "./dashboard-sections";
import { useDashboardState } from "./hooks";
import { parseBingoNumber } from "./utils";

interface AdminDashboardPageProps {
  initialNumbers: NumberRow[];
  initialAppState: AppStateRow;
}

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export function AdminDashboardPage({ initialNumbers, initialAppState }: AdminDashboardPageProps) {
  const [bingoNumbers, setBingoNumbers] = useNumbersPolling(initialNumbers);
  const dashboardState = useDashboardState({
    initialSurveyUrl: initialAppState.survey_url,
    bingoNumbers,
  });
  const parsedSubmitNumber = parseBingoNumber(dashboardState.submitNumberInput);

  const handleCreate = async () => {
    const nextNumber = parseBingoNumber(dashboardState.submitNumberInput);
    if (nextNumber === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }

    const result = await dashboardActions.createNumber(nextNumber);
    if (!result.ok) {
      if (result.error.includes("duplicate") || result.error.includes("numbers_number_unique")) {
        showToast({ title: "重複番号", description: `${nextNumber} は既に入力済みです。` });
        return;
      }
      showToast({ title: "登録失敗", description: "番号の登録に失敗しました。" });
      return;
    }

    setBingoNumbers((prev) =>
      [...prev.filter((bingoNumber) => bingoNumber.id !== result.data.id), result.data].sort(
        (a, b) => a.id - b.id,
      ),
    );
    dashboardState.resetSubmitNumberInput();
    showToast({ title: "登録完了", description: `${nextNumber} を追加しました。` });
  };

  const handleDelete = async () => {
    const target = parseBingoNumber(dashboardState.deleteInput);
    if (target === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }

    const result = await dashboardActions.deleteNumber(target);
    if (!result.ok) {
      console.error(result.error);
      showToast({ title: "削除失敗", description: "番号の削除に失敗しました。" });
      return;
    }

    setBingoNumbers((prev) => prev.filter((bingoNumber) => bingoNumber.id !== result.data.id));
    dashboardState.resetDeleteInput();
    showToast({ title: "削除完了", description: `${target} を削除しました。` });
  };

  const handleLogout = async () => {
    await dashboardActions.logout();
  };

  const handleSurvey = async (isSurveyActive: boolean) => {
    const result = await dashboardActions.saveSurveyState({
      surveyUrl: dashboardState.surveyUrl,
      isSurveyActive,
    });
    if (!result.ok) {
      console.error(result.error);
      showToast({ title: "更新失敗", description: "アンケート設定の更新に失敗しました。" });
      return;
    }

    showToast({
      title: isSurveyActive ? "アンケート配信" : "アンケート停止",
      description: isSurveyActive ? "アンケートを送信しました。" : "アンケートを停止しました。",
    });
  };

  const handleIncrementReach = async () => {
    const result = await dashboardActions.incrementReach();
    if (!result.ok) {
      console.error(result.error);
      showToast({ title: "更新失敗", description: "リーチ数の増加に失敗しました。" });
      return;
    }

    showToast({ title: "更新完了", description: "リーチ数を 1 増加しました。" });
  };

  const handleDecrementReach = async () => {
    const result = await dashboardActions.decrementReach();
    if (!result.ok) {
      console.error(result.error);
      showToast({ title: "更新失敗", description: "リーチ数の減少に失敗しました。" });
      return;
    }

    showToast({ title: "更新完了", description: "リーチ数を 1 減少しました。" });
  };

  const deleteNumberOptions = [...bingoNumbers].reverse().map((bingoNumber) => ({
    id: String(bingoNumber.number),
    label: `${bingoNumber.number}`,
  }));

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-900 via-zinc-950 to-black pb-8 text-zinc-100 sm:pb-10">
      <MyToastRegion />
      <JudgementModal
        isOpened={dashboardState.isJudgementModalOpen}
        setIsOpened={dashboardState.setIsJudgementModalOpen}
        bingoNumbers={bingoNumbers}
      />
      <UpdateNumberModal
        isOpened={dashboardState.isUpdateNumberModalOpen}
        setIsOpened={dashboardState.setIsUpdateNumberModalOpen}
        id={dashboardState.selectedId}
        initialNumber={dashboardState.selectedNumber}
        onSubmit={async ({ id, number }) => {
          const result = await dashboardActions.updateNumber(id, number);
          if (!result.ok) {
            console.error(result.error);
            showToast({ title: "更新失敗", description: "番号の更新に失敗しました。" });
            throw new Error(result.error);
          }

          setBingoNumbers((prev) =>
            prev
              .map((bingoNumber) => (bingoNumber.id === result.data.id ? result.data : bingoNumber))
              .sort((a, b) => a.id - b.id),
          );
          showToast({ title: "更新完了", description: "番号を更新しました。" });
        }}
      />
      <AdminHeader user="Admin">
        <div className="flex items-center gap-1.5">
          <Button onPress={() => dashboardState.setIsJudgementModalOpen(true)}>正誤判定</Button>
          <Button onPress={handleLogout} variant="secondary">
            ログアウト
          </Button>
        </div>
      </AdminHeader>

      <div className="mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <CreateNumberSection
          submitNumberFieldKey={dashboardState.submitNumberFieldKey}
          parsedSubmitNumber={parsedSubmitNumber}
          onSubmitNumberInputChange={dashboardState.setSubmitNumberInput}
          onCreate={handleCreate}
        />

        <DeleteNumberSection
          deleteInput={dashboardState.deleteInput}
          selectedDeleteNumber={dashboardState.selectedDeleteNumber}
          deleteNumberOptions={deleteNumberOptions}
          onDeleteInputChange={dashboardState.handleDeleteInputChange}
          onDeleteSelectionChange={dashboardState.handleDeleteSelectionChange}
          onDelete={handleDelete}
        />

        <ReachControlSection
          onIncrement={handleIncrementReach}
          onDecrement={handleDecrementReach}
        />

        <SurveyControlSection
          surveyUrl={dashboardState.surveyUrl}
          onSurveyUrlChange={dashboardState.setSurveyUrl}
          onActivate={() => handleSurvey(true)}
          onDeactivate={() => handleSurvey(false)}
        />
      </div>

      <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <BingoResult
          bingoResultNumber={bingoNumbers}
          onClick={dashboardState.openUpdateNumberModal}
        />
      </div>
    </div>
  );
}
