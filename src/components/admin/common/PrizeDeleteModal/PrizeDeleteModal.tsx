import { AdminButton, AdminModalShell } from "@/components/admin/ui";

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
          <AdminButton variant="secondary" onClick={close}>
            キャンセル
          </AdminButton>
          <AdminButton variant="danger" onClick={handleConfirm}>
            削除する
          </AdminButton>
        </>
      }
    >
      <p className="text-base leading-relaxed text-[var(--admin-muted-text)]">
        次の景品を削除します:{" "}
        <span className="font-bold text-[var(--admin-text)]">{prizeName}</span>
      </p>
    </AdminModalShell>
  );
};

export default PrizeDeleteModal;
