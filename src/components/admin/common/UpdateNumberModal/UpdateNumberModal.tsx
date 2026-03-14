"use client";

import { useEffect, useState } from "react";

import { AdminButton, AdminInput, AdminModalShell } from "@/components/admin/ui";

interface UpdateNumberModalProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
  canCloseByClickingBackground?: boolean;
  id?: number;
  initialNumber?: number;
  onSubmit: (params: { id: number; number: number }) => Promise<void> | void;
}

const UpdateNumberModal = ({
  isOpened,
  setIsOpened,
  canCloseByClickingBackground = true,
  id,
  initialNumber = 0,
  onSubmit,
}: UpdateNumberModalProps) => {
  const [number, setNumber] = useState<number>(initialNumber);

  useEffect(() => {
    setNumber(initialNumber);
  }, [initialNumber, isOpened]);

  const closeModal = () => setIsOpened(false);

  const handleSubmit = async () => {
    if (id === undefined || Number.isNaN(number) || number < 1 || number > 99) {
      return;
    }

    await onSubmit({ id, number });
    closeModal();
  };

  return (
    <AdminModalShell
      isOpen={isOpened}
      onClose={closeModal}
      canCloseByClickingBackground={canCloseByClickingBackground}
      title="番号の修正"
      panelClassName="max-w-md"
      footer={
        <>
          <AdminButton variant="secondary" onClick={closeModal}>
            キャンセル
          </AdminButton>
          <AdminButton onClick={handleSubmit}>修正</AdminButton>
        </>
      }
    >
      <div className="space-y-2">
        <p className="m-0 text-base text-[var(--admin-muted-text)]">
          1〜99の範囲で入力してください。
        </p>
        <AdminInput
          type="number"
          min={1}
          max={99}
          value={number}
          onChange={(event) => setNumber(Number(event.target.value))}
        />
      </div>
    </AdminModalShell>
  );
};

export default UpdateNumberModal;
