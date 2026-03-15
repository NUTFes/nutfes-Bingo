"use client";

import { Button } from "@/components/ui/Button";
import { ComboBox, ComboBoxItem } from "@/components/ui/ComboBox";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Form } from "@/components/ui/Form";
import { NumberField } from "@/components/ui/NumberField";
import { Separator } from "@/components/ui/Separator";

interface CreateNumberSectionProps {
  submitNumberFieldKey: number;
  parsedSubmitNumber: number | undefined;
  onSubmitNumberInputChange: (value: string) => void;
  onCreate: () => Promise<void> | void;
}

export function CreateNumberSection({
  submitNumberFieldKey,
  parsedSubmitNumber,
  onSubmitNumberInputChange,
  onCreate,
}: CreateNumberSectionProps) {
  return (
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
            void onCreate();
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
                onSubmitNumberInputChange(event.currentTarget.value);
              }}
              onChange={(value) => {
                onSubmitNumberInputChange(Number.isFinite(value) ? String(value) : "");
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
  );
}

interface DeleteNumberOption {
  id: string;
  label: string;
}

interface DeleteNumberSectionProps {
  deleteInput: string;
  selectedDeleteNumber: string | null;
  deleteNumberOptions: DeleteNumberOption[];
  onDeleteInputChange: (value: string) => void;
  onDeleteSelectionChange: (value: string | null) => void;
  onDelete: () => Promise<void> | void;
}

export function DeleteNumberSection({
  deleteInput,
  selectedDeleteNumber,
  deleteNumberOptions,
  onDeleteInputChange,
  onDeleteSelectionChange,
  onDelete,
}: DeleteNumberSectionProps) {
  return (
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
            void onDelete();
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
              onInputChange={onDeleteInputChange}
              onSelectionChange={(key) => {
                onDeleteSelectionChange(key ? String(key) : null);
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
  );
}

interface ReachControlSectionProps {
  onIncrement: () => Promise<void> | void;
  onDecrement: () => Promise<void> | void;
}

export function ReachControlSection({ onIncrement, onDecrement }: ReachControlSectionProps) {
  return (
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
          <Button className="w-full" onPress={() => void onIncrement()}>
            リーチ数を +1
          </Button>
          <Button className="w-full" onPress={() => void onDecrement()}>
            リーチ数を -1
          </Button>
        </div>
      </div>
    </section>
  );
}

interface SurveyControlSectionProps {
  surveyUrl: string;
  onSurveyUrlChange: (value: string) => void;
  onActivate: () => Promise<void> | void;
  onDeactivate: () => Promise<void> | void;
}

export function SurveyControlSection({
  surveyUrl,
  onSurveyUrlChange,
  onActivate,
  onDeactivate,
}: SurveyControlSectionProps) {
  return (
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
            onChange={(event) => onSurveyUrlChange(event.target.value)}
          />
        </FieldGroup>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button className="w-full" onPress={() => void onActivate()}>
            配信する
          </Button>
          <Button className="w-full" variant="secondary" onPress={() => void onDeactivate()}>
            配信を停止する
          </Button>
        </div>
      </div>
    </section>
  );
}
