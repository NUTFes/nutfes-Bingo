"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type SetStateAction } from "react";
import { isFileDropItem, type DropEvent } from "react-aria";
import { AdminHeader, AdminLoading } from "@/components/admin";
import type { PrizeWithImageUrl } from "@/types/bingo/types";
import { MyToastRegion } from "@/components/ui/Toast";
import { queue } from "@/components/ui/toastQueue";
import {
  PrizeCreateFormSection,
  PrizeCreatePreviewSection,
} from "./components/PrizeCreateSections";
import PrizeResult from "./components/PrizeResult";
import { prizeActions } from "./actions-client";
import { fetchAdminState } from "@/lib/admin-api";

interface AdminPrizeCreatePageProps {
  initialPrizes: PrizeWithImageUrl[];
}

interface PrizeCreateLoadState {
  bingoPrize: PrizeWithImageUrl[];
  loadError: string | null;
  isLoaded: boolean;
}

type PrizeCreateLoadAction =
  | { type: "load-success"; prizes: PrizeWithImageUrl[] }
  | { type: "load-error"; message: string }
  | { type: "set-prizes"; value: SetStateAction<PrizeWithImageUrl[]> };

const prizeCreateLoadReducer = (
  state: PrizeCreateLoadState,
  action: PrizeCreateLoadAction,
): PrizeCreateLoadState => {
  switch (action.type) {
    case "load-success":
      return { bingoPrize: action.prizes, loadError: null, isLoaded: true };
    case "load-error":
      return { ...state, loadError: action.message };
    case "set-prizes":
      return {
        ...state,
        bingoPrize:
          typeof action.value === "function" ? action.value(state.bingoPrize) : action.value,
      };
  }
};

const TOAST_TIMEOUT = 5000;

const showToast = (content: { title: string; description?: string }) => {
  queue.add(content, { timeout: TOAST_TIMEOUT });
};

export function AdminPrizeCreatePage({ initialPrizes }: AdminPrizeCreatePageProps) {
  const [{ bingoPrize, loadError, isLoaded }, dispatchLoadState] = useReducer(
    prizeCreateLoadReducer,
    {
      bingoPrize: initialPrizes,
      loadError: null,
      isLoaded: false,
    },
  );
  const setBingoPrize = (value: SetStateAction<PrizeWithImageUrl[]>) => {
    dispatchLoadState({ type: "set-prizes", value });
  };
  const [formState, setFormState] = useState({
    prizeNameJp: "",
    prizeNameEn: "",
    imageFile: null as File | null,
    previewUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const { prizeNameJp, prizeNameEn, imageFile, previewUrl } = formState;

  useEffect(() => {
    const controller = new AbortController();
    void fetchAdminState(controller.signal)
      .then((state) => {
        dispatchLoadState({ type: "load-success", prizes: state.prizes });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
          dispatchLoadState({
            type: "load-error",
            message: "景品データを取得できませんでした。接続を確認して再読み込みしてください。",
          });
          showToast({ title: "読込失敗", description: "景品データを取得できませんでした。" });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      if (previewUrlRef.current !== null) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  const handleFileSelected = useCallback((targetFile: File | null) => {
    if (previewUrlRef.current !== null) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (!targetFile) {
      setFormState((prev) => ({
        ...prev,
        imageFile: null,
        previewUrl: "",
      }));
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(targetFile);
    previewUrlRef.current = nextPreviewUrl;
    setFormState((prev) => ({
      ...prev,
      imageFile: targetFile,
      previewUrl: nextPreviewUrl,
    }));
  }, []);

  const handleDrop = useCallback(
    async (event: DropEvent) => {
      const item = event.items.find(isFileDropItem);
      if (item) {
        handleFileSelected(await item.getFile());
      }
    },
    [handleFileSelected],
  );

  const submit = async () => {
    if (!prizeNameJp) {
      showToast({ title: "入力不足", description: "景品名を入力してください。" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("nameJp", prizeNameJp);
      formData.set("nameEn", prizeNameEn);
      if (imageFile) {
        formData.set("file", imageFile);
      }
      const result = await prizeActions.createPrize(formData);
      if (!result.ok) {
        console.error(result.error);
        try {
          const state = await fetchAdminState();
          setBingoPrize(state.prizes);
          const matchingPrize = state.prizes.find(
            (prize) => prize.name_jp === prizeNameJp && prize.name_en === (prizeNameEn || null),
          );
          showToast(
            matchingPrize
              ? {
                  title: "登録済み",
                  description: "サーバー上の景品一覧へ反映しました。",
                }
              : {
                  title: "登録失敗",
                  description: "サーバーの最新景品一覧を表示しています。",
                },
          );
        } catch (refreshError) {
          console.error(refreshError);
          showToast({
            title: "登録結果を確認できません",
            description: "ページを再読み込みして景品一覧を確認してください。",
          });
        }
        return;
      }
      const prize = result.data;
      setBingoPrize((prev) => [...prev.filter((item) => item.id !== prize.id), prize]);
      if (previewUrlRef.current !== null) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setFormState({
        prizeNameJp: "",
        prizeNameEn: "",
        imageFile: null,
        previewUrl: "",
      });
      showToast({ title: "登録完了", description: "景品を登録しました。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <AdminLoading error={loadError} />;
  }

  return (
    <div className="min-h-screen bg-background pb-8 text-foreground sm:pb-10">
      <MyToastRegion />
      <AdminHeader />

      <div className="mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-5 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PrizeCreateFormSection
          prizeNameJp={prizeNameJp}
          prizeNameEn={prizeNameEn}
          onDrop={handleDrop}
          onFileSelected={handleFileSelected}
          onNameJpChange={(value) => setFormState((prev) => ({ ...prev, prizeNameJp: value }))}
          onNameEnChange={(value) => setFormState((prev) => ({ ...prev, prizeNameEn: value }))}
          onSubmit={() => void submit()}
        />
        <PrizeCreatePreviewSection
          previewUrl={previewUrl}
          isSubmitting={isSubmitting}
          onSubmit={() => void submit()}
        />
      </div>

      <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <PrizeResult
          prizeResult={bingoPrize}
          setBingoPrize={setBingoPrize}
          showToggle={false}
          showOverlay={false}
          onToggle={async (id, isWon) => {
            const result = await prizeActions.togglePrizeWon(id, isWon);
            if (!result.ok) {
              throw new Error(result.error);
            }
            return result.data;
          }}
          onDelete={async (prize) => {
            const result = await prizeActions.deletePrize(prize.id);
            if (!result.ok) {
              throw new Error(result.error);
            }
          }}
          onUpdate={async ({ id, nameJp, nameEn, file }) => {
            const formData = new FormData();
            formData.set("id", String(id));
            formData.set("nameJp", nameJp);
            formData.set("nameEn", nameEn);
            if (file) {
              formData.set("file", file);
            }
            const result = await prizeActions.updatePrize(formData);
            if (!result.ok) {
              throw new Error(result.error);
            }
            return result.data;
          }}
        />
      </div>
    </div>
  );
}
