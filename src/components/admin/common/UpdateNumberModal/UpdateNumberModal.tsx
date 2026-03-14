"use client";

import { useEffect, useState } from "react";

import { AdminModalShell } from "@/components/admin/ui/modal-shell";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { NumberField } from "@/components/ui/NumberField";

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
  const isValidNumber = Number.isInteger(number) && number >= 1 && number <= 99;

  useEffect(() => {
    setNumber(initialNumber);
  }, [initialNumber, isOpened]);

  const closeModal = () => setIsOpened(false);

  const handleSubmit = async () => {
    if (id === undefined || !isValidNumber) {
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
          <Button variant="secondary" onPress={closeModal}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            isDisabled={id === undefined || !isValidNumber}
          >
            修正
          </Button>
        </>
      }
    >
      <Form
        className="gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <p className="m-0 text-base text-[var(--admin-muted-text)]">
          1〜99の範囲で入力してください。
        </p>
        <NumberField
          key={`${isOpened}-${initialNumber}`}
          minValue={1}
          maxValue={99}
          defaultValue={initialNumber > 0 ? initialNumber : undefined}
          placeholder="番号を入力"
          className="w-full max-w-xs"
          onInput={(event) => {
            const nextValue = Number(event.currentTarget.value);
            setNumber(Number.isFinite(nextValue) ? nextValue : 0);
          }}
          onChange={(value) => setNumber(Number.isFinite(value) ? value : 0)}
        />
      </Form>
    </AdminModalShell>
  );
};

export default UpdateNumberModal;
