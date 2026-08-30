import { useEffect, useReducer, type SetStateAction } from "react";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminLoading from "@/components/admin/AdminLoading";
import BingoResult from "@/components/admin/BingoResult";
import { Button } from "@/components/ui/Button";
import { MyToastRegion } from "@/components/ui/Toast";
import { queue } from "@/components/ui/toastQueue";
import { EMPTY_APP_STATE, type AppStateRow, type NumberRow } from "@/types/bingo/types";
import JudgementModal from "./components/JudgementModal";
import UpdateNumberModal from "./components/UpdateNumberModal";
import { dashboardActions } from "./actions-client";
import {
  AnnualEventSection,
  CreateNumberSection,
  DeleteNumberSection,
  ReachControlSection,
  SurveyControlSection,
} from "./dashboard-sections";
import { useDashboardState } from "./hooks";
import { parseBingoNumber } from "./utils";
import { fetchAdminState } from "@/lib/admin-api";

interface DashboardLoadState {
  bingoNumbers: NumberRow[];
  eventId: string;
  revision: number;
  loadError: string | null;
  isLoaded: boolean;
  surveyUrl: string;
  surveyTitle: string;
  surveyDescription: string;
  surveyButtonLabel: string;
}

type SurveyField = "surveyUrl" | "surveyTitle" | "surveyDescription" | "surveyButtonLabel";

type DashboardLoadAction =
  | {
      type: "sync-authoritative";
      numbers: NumberRow[];
      appState: AppStateRow;
      revision: number;
      markLoaded?: boolean;
    }
  | { type: "load-error"; message: string }
  | { type: "set-numbers"; value: SetStateAction<NumberRow[]> }
  | { type: "set-survey-field"; field: SurveyField; value: string }
  | { type: "sync-survey"; appState: AppStateRow };

const dashboardLoadReducer = (
  state: DashboardLoadState,
  action: DashboardLoadAction,
): DashboardLoadState => {
  switch (action.type) {
    case "sync-authoritative":
      return {
        ...state,
        bingoNumbers: action.numbers,
        eventId: action.appState.event_id,
        revision: action.revision,
        surveyUrl: action.appState.survey_url,
        surveyTitle: action.appState.survey_title,
        surveyDescription: action.appState.survey_description,
        surveyButtonLabel: action.appState.survey_button_label,
        loadError: null,
        isLoaded: action.markLoaded ? true : state.isLoaded,
      };
    case "load-error":
      return { ...state, loadError: action.message };
    case "set-numbers":
      return {
        ...state,
        bingoNumbers:
          typeof action.value === "function" ? action.value(state.bingoNumbers) : action.value,
      };
    case "set-survey-field":
      return { ...state, [action.field]: action.value };
    case "sync-survey":
      return {
        ...state,
        surveyUrl: action.appState.survey_url,
        surveyTitle: action.appState.survey_title,
        surveyDescription: action.appState.survey_description,
        surveyButtonLabel: action.appState.survey_button_label,
      };
  }
};

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const handleLogout = async () => {
  await dashboardActions.logout();
};

const mutateReach = async (direction: "increment" | "decrement") => {
  try {
    if (direction === "increment") {
      await dashboardActions.incrementReach();
    } else {
      await dashboardActions.decrementReach();
    }
    showToast({
      title: "更新完了",
      description:
        direction === "increment" ? "リーチ数を 1 増加しました。" : "リーチ数を 1 減少しました。",
    });
  } catch (error) {
    console.error(error);
    showToast({
      title: "更新結果を確認できません",
      description: "サーバーの最新状態を再取得します。",
    });
  }
};

export function AdminDashboardPage() {
  const [
    {
      bingoNumbers,
      eventId,
      revision,
      loadError,
      isLoaded,
      surveyUrl,
      surveyTitle,
      surveyDescription,
      surveyButtonLabel,
    },
    dispatchLoadState,
  ] = useReducer(dashboardLoadReducer, {
    bingoNumbers: [],
    eventId: EMPTY_APP_STATE.event_id,
    revision: 0,
    loadError: null,
    isLoaded: false,
    surveyUrl: EMPTY_APP_STATE.survey_url,
    surveyTitle: EMPTY_APP_STATE.survey_title,
    surveyDescription: EMPTY_APP_STATE.survey_description,
    surveyButtonLabel: EMPTY_APP_STATE.survey_button_label,
  });
  const setBingoNumbers = (value: SetStateAction<NumberRow[]>) => {
    dispatchLoadState({ type: "set-numbers", value });
  };
  const setSurveyField = (field: SurveyField, value: string) => {
    dispatchLoadState({ type: "set-survey-field", field, value });
  };
  const dashboardState = useDashboardState({ bingoNumbers });

  const refreshAuthoritativeState = async () => {
    try {
      const state = await fetchAdminState();
      dispatchLoadState({
        type: "sync-authoritative",
        numbers: state.numbers,
        appState: state.appState,
        revision: state.revision,
      });
      return state;
    } catch (error) {
      console.error(error);
      showToast({
        title: "再読込失敗",
        description: "サーバー状態を確認できません。ページを再読み込みしてください。",
      });
      return null;
    }
  };
  const runReachMutation = async (direction: "increment" | "decrement") => {
    await mutateReach(direction);
    await refreshAuthoritativeState();
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetchAdminState(controller.signal)
      .then((state) => {
        dispatchLoadState({
          type: "sync-authoritative",
          numbers: state.numbers,
          appState: state.appState,
          revision: state.revision,
          markLoaded: true,
        });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
          dispatchLoadState({
            type: "load-error",
            message: "管理データを取得できませんでした。接続を確認して再読み込みしてください。",
          });
          showToast({ title: "読込失敗", description: "管理データを取得できませんでした。" });
        }
      });
    return () => controller.abort();
  }, []);
  const parsedSubmitNumber = parseBingoNumber(dashboardState.submitNumberInput);

  const handleCreate = async () => {
    const nextNumber = parseBingoNumber(dashboardState.submitNumberInput);
    if (nextNumber === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }
    try {
      const created = await dashboardActions.createNumber(nextNumber);
      setBingoNumbers((prev) =>
        [...prev.filter((bingoNumber) => bingoNumber.id !== created.id), created].sort(
          (a, b) => a.id - b.id,
        ),
      );
      dashboardState.resetSubmitNumberInput();
      showToast({ title: "登録完了", description: `${nextNumber} を追加しました。` });
    } catch (error) {
      console.error(error);
      const message = toErrorMessage(error);
      const state = await refreshAuthoritativeState();
      if (state?.numbers.some((number) => number.number === nextNumber)) {
        dashboardState.resetSubmitNumberInput();
        showToast({
          title: "登録済み",
          description: `${nextNumber} はサーバーへ登録されています。`,
        });
        return;
      }
      if (
        message.includes("duplicate") ||
        message.includes("numbers_number_unique") ||
        message.includes("同じ番号が既に登録")
      ) {
        showToast({ title: "重複番号", description: `${nextNumber} は既に入力済みです。` });
        return;
      }
      showToast({ title: "登録失敗", description: "番号の登録結果を確認できませんでした。" });
    }
  };

  const handleDelete = async () => {
    const target = parseBingoNumber(dashboardState.deleteInput);
    if (target === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }
    try {
      const deleted = await dashboardActions.deleteNumber(target);
      setBingoNumbers((prev) => prev.filter((bingoNumber) => bingoNumber.id !== deleted.id));
      dashboardState.resetDeleteInput();
      showToast({ title: "削除完了", description: `${target} を削除しました。` });
    } catch (error) {
      console.error(error);
      const state = await refreshAuthoritativeState();
      if (state && !state.numbers.some((number) => number.number === target)) {
        dashboardState.resetDeleteInput();
        showToast({ title: "削除済み", description: `${target} はサーバーから削除されています。` });
        return;
      }
      showToast({ title: "削除失敗", description: "番号の削除結果を確認できませんでした。" });
    }
  };

  const handleSurvey = async (isSurveyActive: boolean) => {
    try {
      const appState = await dashboardActions.saveSurveyState({
        surveyUrl,
        surveyTitle,
        surveyDescription,
        surveyButtonLabel,
        isSurveyActive,
      });
      dispatchLoadState({ type: "sync-survey", appState });
      showToast({
        title: isSurveyActive ? "アンケート配信" : "アンケート停止",
        description: isSurveyActive ? "アンケートを送信しました。" : "アンケートを停止しました。",
      });
    } catch (error) {
      console.error(error);
      await refreshAuthoritativeState();
      showToast({
        title: "更新結果を再確認しました",
        description: "サーバーの最新アンケート設定を表示しています。",
      });
    }
  };

  const handleStartAnnualEvent = async (newEventId: string) => {
    const stateBeforeReset = await refreshAuthoritativeState();
    if (stateBeforeReset === null) return false;
    if (stateBeforeReset.appState.event_id !== eventId) {
      showToast({
        title: "イベントが切り替わっています",
        description: "最新のイベントIDを表示しました。内容を確認してから再実行してください。",
      });
      return false;
    }

    try {
      const result = await dashboardActions.startAnnualEvent({
        expectedRevision: stateBeforeReset.revision,
        expectedEventId: stateBeforeReset.appState.event_id,
        newEventId,
      });
      const stateAfterReset = await refreshAuthoritativeState();
      showToast({
        title: "新年度を開始しました",
        description: `イベントIDを ${result.eventId} に切り替えました。`,
      });
      return stateAfterReset?.appState.event_id === result.eventId;
    } catch (error) {
      console.error(error);
      const stateAfterReset = await refreshAuthoritativeState();
      showToast({
        title: "年次切替を完了できませんでした",
        description: stateAfterReset
          ? "サーバーの最新状態を表示しています。内容を確認して再実行してください。"
          : "サーバー状態を確認できません。ページを再読み込みしてください。",
      });
      return false;
    }
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
        onNumbersRefresh={setBingoNumbers}
      />
      <UpdateNumberModal
        isOpened={dashboardState.isUpdateNumberModalOpen}
        setIsOpened={dashboardState.setIsUpdateNumberModalOpen}
        id={dashboardState.selectedId}
        initialNumber={dashboardState.selectedNumber}
        onSubmit={async ({ id, number }) => {
          try {
            const updated = await dashboardActions.updateNumber(id, number);
            setBingoNumbers((prev) =>
              prev
                .map((bingoNumber) => (bingoNumber.id === updated.id ? updated : bingoNumber))
                .sort((a, b) => a.id - b.id),
            );
            showToast({ title: "更新完了", description: "番号を更新しました。" });
          } catch (error) {
            console.error(error);
            await refreshAuthoritativeState();
            showToast({
              title: "更新結果を再確認しました",
              description: "サーバーの最新番号一覧を表示しています。",
            });
            throw error;
          }
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
                onIncrement={() => runReachMutation("increment")}
                onDecrement={() => runReachMutation("decrement")}
              />
              <SurveyControlSection
                surveyUrl={surveyUrl}
                surveyTitle={surveyTitle}
                surveyDescription={surveyDescription}
                surveyButtonLabel={surveyButtonLabel}
                onSurveyUrlChange={(value) => setSurveyField("surveyUrl", value)}
                onSurveyTitleChange={(value) => setSurveyField("surveyTitle", value)}
                onSurveyDescriptionChange={(value) => setSurveyField("surveyDescription", value)}
                onSurveyButtonLabelChange={(value) => setSurveyField("surveyButtonLabel", value)}
                onActivate={() => handleSurvey(true)}
                onDeactivate={() => handleSurvey(false)}
              />
              <AnnualEventSection
                currentEventId={eventId}
                revision={revision}
                onStart={handleStartAnnualEvent}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
