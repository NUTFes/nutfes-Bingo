"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Form } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { NumberField } from "@/components/ui/NumberField";
import { Separator } from "@/components/ui/Separator";

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
  const [number, setNumber] = useState<number | null>(null);
  const currentNumber = number ?? initialNumber;
  const isValidNumber =
    Number.isInteger(currentNumber) && currentNumber >= 1 && currentNumber <= 99;

  const closeModal = () => {
    setNumber(null);
    setIsOpened(false);
  };

  const handleSubmit = async () => {
    if (id === undefined || !isValidNumber) {
      return;
    }

    await onSubmit({ id, number: currentNumber });
    closeModal();
  };

  return (
    <Modal
      isOpen={isOpened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeModal();
        }
      }}
      isDismissable={canCloseByClickingBackground}
    >
      <Dialog>
        <h3 className="text-xl font-semibold leading-tight text-zinc-100 sm:text-2xl">
          番号の修正
        </h3>
        <Separator className="my-4" />
        <Form
          className="gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1">
            <p className="m-0 text-sm text-zinc-400">修正後の番号</p>
            <p className="m-0 text-xs text-zinc-400">1〜99の範囲で入力してください。</p>
          </div>
          <NumberField
            key={`${isOpened}-${initialNumber}`}
            minValue={1}
            maxValue={99}
            defaultValue={initialNumber > 0 ? initialNumber : undefined}
            placeholder="番号を入力"
            className="w-full"
            onInput={(event) => {
              const nextValue = Number(event.currentTarget.value);
              setNumber(Number.isFinite(nextValue) ? nextValue : null);
            }}
            onChange={(value) => setNumber(Number.isFinite(value) ? value : null)}
          />
          <div className="flex flex-wrap justify-end gap-2.5 sm:gap-3">
            <Button variant="secondary" className="w-full sm:w-auto" onPress={closeModal}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onPress={handleSubmit}
              isDisabled={id === undefined || !isValidNumber}
            >
              修正
            </Button>
          </div>
        </Form>
      </Dialog>
    </Modal>
  );
};

export default UpdateNumberModal;
