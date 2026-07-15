"use client";

import { useEffect, useState } from "react";

import { AdminHeader, AdminLoading, BingoResult } from "@/components/admin";
import { Button } from "@/components/ui/Button";
import { MyToastRegion } from "@/components/ui/Toast";
import { queue } from "@/components/ui/toastQueue";
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
import { fetchAdminState } from "@/lib/admin-api";

interface AdminDashboardPageProps {
  initialNumbers: NumberRow[];
  initialAppState: AppStateRow;
}

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

const handleLogout = async () => {
  await dashboardActions.logout();
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

export function AdminDashboardPage({ initialNumbers, initialAppState }: AdminDashboardPageProps) {
  const [bingoNumbers, setBingoNumbers] = useState(initialNumbers);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const dashboardState = useDashboardState({
    initialSurveyUrl: initialAppState.survey_url,
    bingoNumbers,
  });
  const { setSurveyUrl } = dashboardState;

  useEffect(() => {
    const controller = new AbortController();
    void fetchAdminState(controller.signal)
      .then((state) => {
        setBingoNumbers(state.numbers);
        setSurveyUrl(state.appState.survey_url);
        setIsLoaded(true);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
          setLoadError("管理データを取得できませんでした。接続を確認して再読み込みしてください。");
          showToast({ title: "読込失敗", description: "管理データを取得できませんでした。" });
        }
      });
    return () => controller.abort();
  }, [setSurveyUrl]);
  const parsedSubmitNumber = parseBingoNumber(dashboardState.submitNumberInput);

  const handleCreate = async () => {
    const nextNumber = parseBingoNumber(dashboardState.submitNumberInput);
    if (nextNumber === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }

    const result = await dashboardActions.createNumber(nextNumber);
    if (!result.ok) {
      if (
        result.error.includes("duplicate") ||
        result.error.includes("numbers_number_unique") ||
        result.error.includes("同じ番号が既に登録")
      ) {
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

  const deleteNumberOptions = [...bingoNumbers].reverse().map((bingoNumber) => ({
    id: String(bingoNumber.number),
    label: `${bingoNumber.number}`,
  }));

  if (!isLoaded) {
    return <AdminLoading error={loadError} />;
  }

  return (
    <div className="min-h-screen bg-background pb-8 text-foreground sm:pb-10">
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
      <AdminHeader>
        <div className="flex items-center gap-1.5">
          <Button onPress={() => dashboardState.setIsJudgementModalOpen(true)}>正誤判定</Button>
          <Button onPress={handleLogout} variant="secondary">
            ログアウト
          </Button>
        </div>
      </AdminHeader>

      <div className="mx-auto mt-8 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="flex flex-col gap-10 lg:col-span-8 lg:gap-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:gap-10">
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
            </div>

            <BingoResult
              bingoResultNumber={bingoNumbers}
              onClick={dashboardState.openUpdateNumberModal}
            />
          </div>

          <div className="flex flex-col gap-8 lg:col-span-4">
            <div className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6 flex flex-col gap-8">
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
          </div>
        </div>
      </div>
    </div>
  );
}
