"use client";

import { useState } from "react";

import type { NumberRow } from "@/types/bingo/types";

interface UseDashboardStateOptions {
  bingoNumbers: NumberRow[];
}

export function useDashboardState({ bingoNumbers }: UseDashboardStateOptions) {
  const [isJudgementModalOpen, setIsJudgementModalOpen] = useState(false);
  const [isUpdateNumberModalOpen, setIsUpdateNumberModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [selectedNumber, setSelectedNumber] = useState(0);
  const [submitNumberInput, setSubmitNumberInput] = useState("");
  const [submitNumberFieldKey, setSubmitNumberFieldKey] = useState(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [selectedDeleteNumber, setSelectedDeleteNumber] = useState<string | null>(null);

  const openUpdateNumberModal = (id: number) => {
    const target = bingoNumbers.find((number) => number.id === id);
    setSelectedId(id);
    setSelectedNumber(target?.number ?? 0);
    setIsUpdateNumberModalOpen(true);
  };

  const resetSubmitNumberInput = () => {
    setSubmitNumberInput("");
    setSubmitNumberFieldKey((prev) => prev + 1);
  };

  const resetDeleteInput = () => {
    setDeleteInput("");
    setSelectedDeleteNumber(null);
  };

  const handleDeleteInputChange = (value: string) => {
    setDeleteInput(value);
    setSelectedDeleteNumber(null);
  };

  const handleDeleteSelectionChange = (value: string | null) => {
    setSelectedDeleteNumber(value);
    setDeleteInput(value ?? "");
  };

  return {
    isJudgementModalOpen,
    setIsJudgementModalOpen,
    isUpdateNumberModalOpen,
    setIsUpdateNumberModalOpen,
    selectedId,
    selectedNumber,
    submitNumberInput,
    setSubmitNumberInput,
    submitNumberFieldKey,
    deleteInput,
    selectedDeleteNumber,
    openUpdateNumberModal,
    resetSubmitNumberInput,
    resetDeleteInput,
    handleDeleteInputChange,
    handleDeleteSelectionChange,
  };
}
