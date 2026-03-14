"use client";

import { useState } from "react";

import {
  createNumber as createNumberAction,
  decrementReach as decrementReachAction,
  deleteNumber as deleteNumberAction,
  incrementReach as incrementReachAction,
  saveSurveyState as saveSurveyStateAction,
  updateNumber as updateNumberAction,
} from "@/app/admin/actions";
import { logout as logoutAction } from "@/app/auth/actions";
import BingoResult from "@/components/admin/common/BingoResult";
import Header from "@/components/admin/common/Header";
import JudgementModal from "@/components/admin/common/JudgementModal";
import UpdateNumberModal from "@/components/admin/common/UpdateNumberModal";
import { Button } from "@/components/ui/Button";
import { ComboBox, ComboBoxItem } from "@/components/ui/ComboBox";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Form } from "@/components/ui/Form";
import { NumberField } from "@/components/ui/NumberField";
import { Separator } from "@/components/ui/Separator";
import { MyToastRegion, queue } from "@/components/ui/Toast";
import { useNumbers } from "@/lib/bingo/client";
import type { AppStateRow, NumberRow } from "@/lib/bingo/types";

interface AdminDashboardPageProps {
  initialNumbers: NumberRow[];
  initialAppState: AppStateRow;
}

const MIN_BINGO_NUMBER = 1;
const MAX_BINGO_NUMBER = 99;
const TOAST_TIMEOUT = 5000;

const parseBingoNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < MIN_BINGO_NUMBER || parsed > MAX_BINGO_NUMBER) {
    return undefined;
  }

  return parsed;
};

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export function AdminDashboardPage({ initialNumbers, initialAppState }: AdminDashboardPageProps) {
  const bingoNumbers = useNumbers(initialNumbers);
  const [isOpened, setIsOpened] = useState(false);
  const [isOpenUpdateNumberModal, setIsOpenUpdateNumberModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [selectedNumber, setSelectedNumber] = useState<number>(0);
  const [submitNumberInput, setSubmitNumberInput] = useState("");
  const [submitNumberFieldKey, setSubmitNumberFieldKey] = useState(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [selectedDeleteNumber, setSelectedDeleteNumber] = useState<string | null>(null);
  const [surveyUrl, setSurveyUrl] = useState(initialAppState.survey_url);
  const parsedSubmitNumber = parseBingoNumber(submitNumberInput);

  const handleNumberClick = (id: number) => {
    const target = bingoNumbers.find((number) => number.id === id);
    setSelectedId(id);
    setSelectedNumber(target?.number ?? 0);
    setIsOpenUpdateNumberModal(true);
  };

  const handleCreate = async () => {
    const nextNumber = parseBingoNumber(submitNumberInput);
    if (nextNumber === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }

    try {
      await createNumberAction(nextNumber);
      setSubmitNumberInput("");
      setSubmitNumberFieldKey((prev) => prev + 1);
      showToast({ title: "登録完了", description: `${nextNumber} を追加しました。` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "番号の登録に失敗しました";
      if (message.includes("duplicate") || message.includes("numbers_number_unique")) {
        showToast({ title: "重複番号", description: `${nextNumber} は既に入力済みです。` });
      } else {
        showToast({ title: "登録失敗", description: "番号の登録に失敗しました。" });
      }
    }
  };

  const handleDelete = async () => {
    const target = parseBingoNumber(deleteInput);
    if (target === undefined) {
      showToast({ title: "入力エラー", description: "番号は 1〜99 の範囲で入力してください。" });
      return;
    }

    try {
      await deleteNumberAction(target);
      setDeleteInput("");
      setSelectedDeleteNumber(null);
      showToast({ title: "削除完了", description: `${target} を削除しました。` });
    } catch (error) {
      console.error(error);
      showToast({ title: "削除失敗", description: "番号の削除に失敗しました。" });
    }
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  const handleSurvey = async (isSurveyActive: boolean) => {
    try {
      await saveSurveyStateAction({ surveyUrl, isSurveyActive });
      showToast({
        title: isSurveyActive ? "アンケート配信" : "アンケート停止",
        description: isSurveyActive ? "アンケートを送信しました。" : "アンケートを停止しました。",
      });
    } catch (error) {
      console.error(error);
      showToast({ title: "更新失敗", description: "アンケート設定の更新に失敗しました。" });
    }
  };

  const deleteNumberOptions = [...bingoNumbers].reverse().map((bingoNumber) => ({
    id: String(bingoNumber.number),
    label: `${bingoNumber.number}`,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black pb-8 text-zinc-100 sm:pb-10">
      <MyToastRegion />
      <JudgementModal isOpened={isOpened} setIsOpened={setIsOpened} bingoNumbers={bingoNumbers} />
      <UpdateNumberModal
        isOpened={isOpenUpdateNumberModal}
        setIsOpened={setIsOpenUpdateNumberModal}
        id={selectedId}
        initialNumber={selectedNumber}
        onSubmit={async ({ id, number }) => {
          try {
            await updateNumberAction(id, number);
            showToast({ title: "更新完了", description: "番号を更新しました。" });
          } catch (error) {
            console.error(error);
            showToast({ title: "更新失敗", description: "番号の更新に失敗しました。" });
            throw error;
          }
        }}
      />
      <Header user="Admin">
        <div className="flex items-center gap-1.5">
          <Button onPress={() => setIsOpened(true)}>正誤判定</Button>
          <Button onPress={handleLogout} variant="secondary">
            ログアウト
          </Button>
        </div>
      </Header>

      <div className="mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
                抽選した番号を入力
              </h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                1〜99の番号を入力して抽選結果に追加します。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-3">
            <Form
              className="gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreate();
              }}
            >
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">登録する番号</p>
                <NumberField
                  key={submitNumberFieldKey}
                  minValue={1}
                  maxValue={99}
                  placeholder="番号を入力"
                  className="w-full"
                  onInput={(event) => {
                    setSubmitNumberInput(event.currentTarget.value);
                  }}
                  onChange={(value) => {
                    setSubmitNumberInput(Number.isFinite(value) ? String(value) : "");
                  }}
                />
              </div>
              <Button
                type="submit"
                isDisabled={parsedSubmitNumber === undefined}
                className="w-full sm:w-auto sm:min-w-36"
              >
                番号を追加
              </Button>
            </Form>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
                抽選した番号を削除
              </h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                入力または候補選択で抽選済み番号を取り消します。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-3">
            <Form
              className="gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">削除する番号</p>
                <ComboBox
                  allowsCustomValue
                  selectedKey={selectedDeleteNumber}
                  inputValue={deleteInput}
                  placeholder="抽選済み番号から選択"
                  className="w-full"
                  items={deleteNumberOptions}
                  onInputChange={(value) => {
                    setDeleteInput(value);
                    setSelectedDeleteNumber(null);
                  }}
                  onSelectionChange={(key) => {
                    const value = key ? String(key) : "";
                    setSelectedDeleteNumber(key ? String(key) : null);
                    setDeleteInput(value);
                  }}
                >
                  {(item) => <ComboBoxItem id={item.id}>{item.label}</ComboBoxItem>}
                </ComboBox>
              </div>
              <Button
                type="submit"
                isDisabled={!deleteInput.trim()}
                className="w-full sm:w-auto sm:min-w-36"
              >
                番号を削除
              </Button>
            </Form>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6 lg:col-span-2">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
                リーチ数の制御
              </h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                現在のリーチ数を1ずつ増減します。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                className="w-full"
                onPress={async () => {
                  try {
                    await incrementReachAction();
                    showToast({ title: "更新完了", description: "リーチ数を 1 増加しました。" });
                  } catch (error) {
                    console.error(error);
                    showToast({ title: "更新失敗", description: "リーチ数の増加に失敗しました。" });
                  }
                }}
              >
                リーチ数を +1
              </Button>
              <Button
                className="w-full"
                onPress={async () => {
                  try {
                    await decrementReachAction();
                    showToast({ title: "更新完了", description: "リーチ数を 1 減少しました。" });
                  } catch (error) {
                    console.error(error);
                    showToast({ title: "更新失敗", description: "リーチ数の減少に失敗しました。" });
                  }
                }}
              >
                リーチ数を -1
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg sm:p-6 lg:col-span-2">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4 sm:gap-4">
            <div className="max-w-3xl space-y-2">
              <h2 className="m-0 text-lg font-semibold leading-tight text-zinc-100 sm:text-xl">
                アンケートURLと配信制御
              </h2>
              <p className="m-0 text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
                URL設定後に配信開始/停止を選択してください。
              </p>
            </div>
          </header>
          <Separator className="mb-4 opacity-70" />
          <div className="space-y-3">
            <FieldGroup>
              <Input
                type="url"
                placeholder="https://forms.gle/..."
                value={surveyUrl}
                onChange={(event) => setSurveyUrl(event.target.value)}
              />
            </FieldGroup>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button className="w-full" onPress={() => void handleSurvey(true)}>
                配信する
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onPress={() => void handleSurvey(false)}
              >
                配信を停止する
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <BingoResult bingoResultNumber={bingoNumbers} onClick={handleNumberClick} />
      </div>
    </div>
  );
}
