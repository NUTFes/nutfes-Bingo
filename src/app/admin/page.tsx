"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { CgLogOut } from "react-icons/cg";
import { toast } from "react-toastify";

import {
  Header,
  BingoResult,
  Button,
  JudgementModal,
  UpdateNumberModal,
  Loading,
} from "@/components/admin";
import styles from "@/styles/Home.module.css";
import { mapNumberRow, mapEventRow, type BingoNumber } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/stores/useAdminStore";

interface formDataCreate {
  submitNumber: number | null;
}

interface formDataDelete {
  inputedNumber: number | null;
  selectedNumber: number | null;
}

interface FormSurvey {
  surveyUrl: string;
}

const supabase = createSupabaseBrowserClient();

const Page = () => {
  const router = useRouter();
  const logout = useAdminStore((state) => state.logout);

  const [bingoNumbers, setBingoNumbers] = useState<BingoNumber[]>([]);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const isopenBool = () => setIsOpened(!isOpened);
  const [isOpenUpdateNumberModal, setIsOpenUpdateNumberModal] =
    useState<boolean>(false);

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
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number>();

  const handleNumberClick = (id: number) => {
    setSelectedId(id);
    setIsOpenUpdateNumberModal(true);
  };

  // アンケート設定フォーム
  const {
    register: registerSurvey,
    getValues: getValuesSurvey,
    reset: resetSurvey,
    formState: { errors: errorsSurvey, isValid: isValidSurvey },
  } = useForm<FormSurvey>({
    mode: "onChange",
    defaultValues: {
      surveyUrl:
        "https://docs.google.com/forms/d/e/1FAIpQLScI8BClIWH8PVO7bJDINADj-xiym37JPl7ULRhBnTMblq6Dbw/viewform?usp=dialog",
    },
  });

  // 最新イベント状態取得
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, survey_url, is_survey_active")
        .order("id", { ascending: false })
        .limit(1);
      if (!error && data && data[0]) {
        const latest = mapEventRow(data[0]);
        resetSurvey({ surveyUrl: latest.surveyUrl || "" });
      }
    };
    load();
  }, [resetSurvey]);

  //番号の追加
  const onSubmitCreate: SubmitHandler<formDataCreate> = () => {
    const { submitNumber } = getValuesCreate();
    if (submitNumber !== null) {
      supabase
        .from("numbers")
        .insert({ number: submitNumber })
        .then(({ error }) => {
          if (error) {
            if (error.message.includes("duplicate key")) {
              toast.warning(`${submitNumber} は既に入力済みです。`);
            } else {
              toast.error("エラーが発生しました。");
            }
          }
        });
      resetCreate({ submitNumber: null });
    }
  };

  //番号の削除
  const onSubmitDelete = async () => {
    const { inputedNumber, selectedNumber } = getValuesDelete();
    const targetNumber = inputedNumber ?? selectedNumber;
    if (!targetNumber) return;
    const { error } = await supabase
      .from("numbers")
      .delete()
      .eq("number", targetNumber);
    if (error) {
      toast.error("番号の削除に失敗しました。");
      return;
    }
    resetDelete({ inputedNumber: null, selectedNumber: null });
  };

  // アンケート配信即時送信
  const handleSendSurvey = async () => {
    const { surveyUrl } = getValuesSurvey();
    try {
      setIsSubmittingSurvey(true);
      const { error } = await supabase
        .from("events")
        .insert({ survey_url: surveyUrl || "", is_survey_active: true });
      if (error) throw error;
      toast.success("アンケートを送信しました。");
    } catch (error) {
      toast.error("アンケートの送信に失敗しました。");
    } finally {
      setIsSubmittingSurvey(false);
    }
  };
  const handleStopSurvey = async () => {
    const { surveyUrl } = getValuesSurvey();
    try {
      setIsSubmittingSurvey(true);
      const { error } = await supabase
        .from("events")
        .insert({ survey_url: surveyUrl || "", is_survey_active: false });
      if (error) throw error;
      toast.success("アンケートを停止しました。");
    } catch (error) {
      toast.error("アンケートの停止に失敗しました。");
    } finally {
      setIsSubmittingSurvey(false);
    }
  };
  useEffect(() => {
    const fetchNumbers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("numbers")
        .select("id, number, created_at, updated_at")
        .order("id", { ascending: true });
      if (!error && data) {
        setBingoNumbers(data.map(mapNumberRow));
      }
      setLoading(false);
    };

    fetchNumbers();

    const channel = supabase
      .channel("numbers-changes-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "numbers" },
        () => {
          fetchNumbers();
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[Realtime] numbers channel error:", err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className={styles.container}>
      <JudgementModal
        isOpened={isOpened}
        setIsOpened={setIsOpened}
        bingoNumbers={bingoNumbers}
      />
      <UpdateNumberModal
        isOpened={isOpenUpdateNumberModal}
        setIsOpened={setIsOpenUpdateNumberModal}
        id={selectedId}
      />
      <Header user="Admin">
        <div className={styles.main}>
          <Button
            size="m"
            shape="circle"
            onClick={() => router.push("/admin/postPrizes")}
          >
            <p>景品追加</p>
          </Button>
          <Button
            size="m"
            shape="circle"
            onClick={() => router.push("/admin/prizes")}
          >
            <p>景品管理</p>
          </Button>
          <Button size="m" shape="circle" onClick={isopenBool}>
            <p>ビンゴ正誤判定</p>
          </Button>
          <Button
            size="m"
            shape="circle"
            onClick={async () => {
              await supabase.auth.signOut();
              logout();
              router.push("/admin/login");
            }}
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
        <div className={styles.frame}>
          <div className={styles.item}>
            <button
              type="button"
              className={styles.Button}
              onClick={async () => {
                const { error } = await supabase.rpc(
                  "increment_latest_reach_log",
                );
                if (error) {
                  toast.error("リーチ数の更新に失敗しました。");
                }
              }}
            >
              リーチ数を 1 増加する
            </button>
            <button
              type="button"
              className={styles.Button}
              onClick={async () => {
                const { error } = await supabase.rpc(
                  "decrement_latest_reach_log",
                );
                if (error) {
                  toast.error("リーチ数の更新に失敗しました。");
                }
              }}
            >
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
                {...registerSurvey("surveyUrl", {
                  required: "URLを入力してください",
                  pattern: {
                    value: /^(https?:\/\/[^\s$.?#].[^\s]*)$/i,
                    message: "有効なURLを入力してください",
                  },
                })}
              />
              {errorsSurvey?.surveyUrl && (
                <div className={styles.errormessage}>
                  {errorsSurvey.surveyUrl.message}
                </div>
              )}
            </div>
          </div>
          <div className={`${styles.item} ${styles.surveyRow}`}>
            <div className={styles.surveyButtons}>
              <button
                type="button"
                onClick={handleSendSurvey}
                disabled={!isValidSurvey || isSubmittingSurvey}
                className={styles.Button}
              >
                アンケート送信
              </button>
              <button
                type="button"
                onClick={handleStopSurvey}
                disabled={!isValidSurvey || isSubmittingSurvey}
                className={styles.Button}
              >
                アンケート停止
              </button>
            </div>
          </div>
        </div>
      </div>
      <BingoResult
        bingoResultNumber={bingoNumbers}
        onClick={handleNumberClick}
      />
    </div>
  );
};

export default Page;
