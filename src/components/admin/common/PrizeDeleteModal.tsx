import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Modal } from "@/components/ui/Modal";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";

interface Props {
  isOpened: boolean;
  setIsOpened: (v: boolean) => void;
  prizeName?: string;
  onConfirm: () => Promise<void> | void;
  canCloseByClickingBackground?: boolean;
}

const PrizeDeleteModal = ({
  isOpened,
  setIsOpened,
  prizeName,
  onConfirm,
  canCloseByClickingBackground = true,
}: Props) => {
  const close = () => setIsOpened(false);

  const handleConfirm = async () => {
    await onConfirm();
    close();
  };

  return (
    <Modal
      isOpen={isOpened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close();
        }
      }}
      isDismissable={canCloseByClickingBackground}
    >
      <Dialog
        className={cn(
          "relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-2xl sm:p-6",
          "max-w-md",
        )}
      >
        <h3 className="text-xl font-semibold leading-tight text-zinc-100 sm:text-2xl">
          景品を削除しますか？
        </h3>
        <Separator className="my-4 opacity-75" />
        <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/70 p-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            次の景品を削除します。この操作は取り消せません。
          </p>
          <p className="text-base font-bold leading-relaxed text-zinc-100">{prizeName}</p>
        </div>
        <Separator className="my-4 opacity-75" />
        <div className="flex flex-wrap justify-end gap-2.5 sm:gap-3">
          <Button variant="secondary" onPress={close}>
            キャンセル
          </Button>
          <Button variant="destructive" onPress={handleConfirm}>
            削除する
          </Button>
        </div>
      </Dialog>
    </Modal>
  );
};

export default PrizeDeleteModal;
