import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ComboBox, ComboBoxItem } from "@/components/ui/ComboBox";
import { Form } from "@/components/ui/Form";
import { NumberField } from "@/components/ui/NumberField";
import { TextField } from "@/components/ui/TextField";
import {
  MAX_BINGO_NUMBER,
  MAX_SURVEY_BUTTON_LABEL_LENGTH,
  MAX_SURVEY_DESCRIPTION_LENGTH,
  MAX_SURVEY_TITLE_LENGTH,
  MAX_SURVEY_URL_LENGTH,
  MIN_BINGO_NUMBER,
} from "@shared/bingo-constraints";

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
    <section className="flex flex-col gap-3 sm:gap-4">
      <header className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold text-foreground">番号の追加</h2>
        <p className="text-sm text-muted-foreground">
          {MIN_BINGO_NUMBER}〜{MAX_BINGO_NUMBER}の番号を入力して抽選結果に追加します。
        </p>
      </header>
      <div className="space-y-3">
        <Form
          className="gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate();
          }}
        >
          <div className="space-y-2">
            <NumberField
              label="登録する番号"
              key={submitNumberFieldKey}
              minValue={MIN_BINGO_NUMBER}
              maxValue={MAX_BINGO_NUMBER}
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
    <section className="flex flex-col gap-3 sm:gap-4">
      <header className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold text-foreground">番号の削除</h2>
        <p className="text-sm text-muted-foreground">抽選済み番号を取り消します。</p>
      </header>
      <div className="space-y-3">
        <Form
          className="gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onDelete();
          }}
        >
          <div className="space-y-2">
            <ComboBox
              label="削除する番号"
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
              {(item) => (
                <ComboBoxItem id={item.id} textValue={item.label}>
                  {item.label}
                </ComboBoxItem>
              )}
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
    <section className="flex flex-col gap-3 sm:gap-4">
      <header className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold text-foreground">リーチ数</h2>
        <p className="text-sm text-muted-foreground">現在のリーチ数を1ずつ増減します。</p>
      </header>
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
  surveyTitle: string;
  surveyDescription: string;
  surveyButtonLabel: string;
  onSurveyUrlChange: (value: string) => void;
  onSurveyTitleChange: (value: string) => void;
  onSurveyDescriptionChange: (value: string) => void;
  onSurveyButtonLabelChange: (value: string) => void;
  onActivate: () => Promise<void> | void;
  onDeactivate: () => Promise<void> | void;
}

export function SurveyControlSection({
  surveyUrl,
  surveyTitle,
  surveyDescription,
  surveyButtonLabel,
  onSurveyUrlChange,
  onSurveyTitleChange,
  onSurveyDescriptionChange,
  onSurveyButtonLabelChange,
  onActivate,
  onDeactivate,
}: SurveyControlSectionProps) {
  return (
    <section className="flex flex-col gap-3 sm:gap-4">
      <header className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold text-foreground">アンケート配信</h2>
        <p className="text-sm text-muted-foreground">
          案内文とURLを設定して配信開始/停止を選択してください。
        </p>
      </header>
      <Form
        className="gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onActivate();
        }}
      >
        <TextField
          label="タイトル"
          value={surveyTitle}
          onChange={onSurveyTitleChange}
          isRequired
          maxLength={MAX_SURVEY_TITLE_LENGTH}
        />
        <label className="flex flex-col gap-1 font-sans text-sm font-medium text-foreground">
          説明
          <textarea
            className="min-h-28 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none transition focus:border-blue-600"
            value={surveyDescription}
            onChange={(event) => onSurveyDescriptionChange(event.target.value)}
            required
            maxLength={MAX_SURVEY_DESCRIPTION_LENGTH}
          />
        </label>
        <TextField
          label="ボタン文言"
          value={surveyButtonLabel}
          onChange={onSurveyButtonLabelChange}
          isRequired
          maxLength={MAX_SURVEY_BUTTON_LABEL_LENGTH}
        />
        <TextField
          label="URL"
          type="url"
          placeholder="https://forms.gle/..."
          value={surveyUrl}
          onChange={onSurveyUrlChange}
          isRequired
          maxLength={MAX_SURVEY_URL_LENGTH}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="submit" className="w-full">
            配信する
          </Button>
          <Button
            type="button"
            className="w-full"
            variant="secondary"
            onPress={() => void onDeactivate()}
          >
            配信を停止する
          </Button>
        </div>
      </Form>
    </section>
  );
}

interface AnnualEventSectionProps {
  currentEventId: string;
  revision: number;
  onStart: (newEventId: string) => Promise<boolean>;
}

export function AnnualEventSection({ currentEventId, revision, onStart }: AnnualEventSectionProps) {
  const [newEventId, setNewEventId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPending, setIsPending] = useState(false);
  const normalizedEventId = newEventId.trim().toLowerCase();
  const isConfirmed =
    /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalizedEventId) &&
    normalizedEventId !== currentEventId &&
    confirmation.trim().toLowerCase() === normalizedEventId;

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-8 sm:gap-4">
      <header className="max-w-3xl space-y-1">
        <h2 className="text-lg font-semibold text-foreground">年次イベント開始</h2>
        <p className="text-sm text-muted-foreground">
          番号、景品、リーチ、アンケートを空にします。画像ファイル自体は保持されます。
        </p>
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">現在のイベント</dt>
        <dd className="font-mono text-foreground">{currentEventId}</dd>
        <dt className="text-muted-foreground">現在のrevision</dt>
        <dd className="font-mono text-foreground">{revision}</dd>
      </dl>
      <Form
        className="gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isConfirmed || isPending) return;
          setIsPending(true);
          void onStart(normalizedEventId).then((completed) => {
            setIsPending(false);
            if (completed) {
              setNewEventId("");
              setConfirmation("");
            }
          });
        }}
      >
        <TextField
          label="新しいイベントID"
          description="例: 2027-nutfes-bingo"
          value={newEventId}
          onChange={setNewEventId}
        />
        <TextField
          label="確認のため同じイベントIDを再入力"
          value={confirmation}
          onChange={setConfirmation}
        />
        <Button
          type="submit"
          variant="destructive"
          isDisabled={!isConfirmed || isPending}
          isPending={isPending}
          className="w-full"
        >
          現在のデータを消して新年度を開始
        </Button>
      </Form>
    </section>
  );
}
