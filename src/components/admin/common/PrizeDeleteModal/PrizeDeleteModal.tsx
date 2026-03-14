import { AdminModalShell } from "@/components/admin/ui/modal-shell";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";

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
    <AdminModalShell
      isOpen={isOpened}
      onClose={close}
      canCloseByClickingBackground={canCloseByClickingBackground}
      title="景品を削除しますか？"
      panelClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" onPress={close}>
            キャンセル
          </Button>
          <Button variant="destructive" onPress={handleConfirm}>
            削除する
          </Button>
        </>
      }
    >
      <Separator className="mb-4" />
      <p className="text-base leading-relaxed text-[var(--admin-muted-text)]">
        次の景品を削除します:{" "}
        <span className="font-bold text-[var(--admin-text)]">{prizeName}</span>
      </p>
    </AdminModalShell>
  );
};

export default PrizeDeleteModal;
