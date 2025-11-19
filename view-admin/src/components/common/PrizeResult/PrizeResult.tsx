import React, { useMemo, useState } from "react";
import styles from "./PrizeResult.module.css";
import { useMutation } from "@apollo/client";
import {
  UpdateOnePrizeIsWonDocument,
  DeleteOnePrizeDocument,
  DeleteOneImageDocument,
  UpdateOnePrizeBasicDocument,
  UpdateOnePrizeNamesDocument,
} from "@/type/graphql";
import Image from "next/image";
import type {
  UpdateOnePrizeIsWonMutation,
  UpdateOnePrizeIsWonMutationVariables,
  GetListPrizesQuery,
  DeleteOnePrizeMutation,
  DeleteOnePrizeMutationVariables,
  DeleteOneImageMutation,
  DeleteOneImageMutationVariables,
  UpdateOnePrizeBasicMutation,
  UpdateOnePrizeBasicMutationVariables,
  UpdateOnePrizeNamesMutation,
  UpdateOnePrizeNamesMutationVariables,
} from "@/type/graphql";
import { IoClose, IoCreateOutline } from "react-icons/io5";
import { toast } from "react-toastify";
import PrizeDeleteModal from "@/components/common/PrizeDeleteModal/PrizeDeleteModal";
import PrizeEditModal from "@/components/common/PrizeEditModal/PrizeEditModal";

interface PrizeResultProps {
  prizeResult: GetListPrizesQuery["prizes"];
  setBingoPrize: React.Dispatch<
    React.SetStateAction<GetListPrizesQuery["prizes"]>
  >;
  showOverlay: boolean;
  showToggle: boolean;
}

export const PrizeResult = (props: PrizeResultProps) => {
  const [isImageVisible, setIsImageVisible] = useState(true);
  const imageVisibility = () => {
    setIsImageVisible(false);
  };

  const [updatePrize] = useMutation<
    UpdateOnePrizeIsWonMutation,
    UpdateOnePrizeIsWonMutationVariables
  >(UpdateOnePrizeIsWonDocument);

  const [deletePrize] = useMutation<
    DeleteOnePrizeMutation,
    DeleteOnePrizeMutationVariables
  >(DeleteOnePrizeDocument);

  const [deleteImage] = useMutation<
    DeleteOneImageMutation,
    DeleteOneImageMutationVariables
  >(DeleteOneImageDocument);

  const [updatePrizeBasic] = useMutation<
    UpdateOnePrizeBasicMutation,
    UpdateOnePrizeBasicMutationVariables
  >(UpdateOnePrizeBasicDocument);

  const [updatePrizeNames] = useMutation<
    UpdateOnePrizeNamesMutation,
    UpdateOnePrizeNamesMutationVariables
  >(UpdateOnePrizeNamesDocument);

  // 画像URLは都度、対象のprizeに紐づくimageから算出する
  const getImageUrl = (prize: GetListPrizesQuery["prizes"][number]) => {
    if (!prize.image) return "";
    const { bucketName, fileName } = prize.image;
    return `${process.env.NEXT_PUBLIC_STORAGE_ENDPOINT}/${bucketName}/${fileName}`;
  };

  const handleToggleChange = (id: number, isWon: boolean) => {
    updatePrize({ variables: { id: id, isWon: isWon } });
    props.setBingoPrize((prev) =>
      prev.map((prize) =>
        prize.id === id ? { ...prize, isWon: isWon } : prize,
      ),
    );
  };

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  type Selected = {
    prize: { id: number; nameJp: string; nameEn: string };
    image: {
      id: number;
      bucketName: string;
      fileName: string;
      fileType: string;
    } | null;
  };
  const [selected, setSelected] = useState<Selected | null>(null);

  const toSelected = (p: GetListPrizesQuery["prizes"][number]): Selected => ({
    prize: { id: p.id, nameJp: p.nameJp ?? "", nameEn: p.nameEn ?? "" },
    image: p.image
      ? {
          id: p.image.id,
          bucketName: p.image.bucketName,
          fileName: p.image.fileName,
          fileType: p.image.fileType,
        }
      : null,
  });

  const openDelete = (p: GetListPrizesQuery["prizes"][number]) => {
    setSelected(toSelected(p));
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    try {
      const res = await deletePrize({ variables: { id: selected.prize.id } });
      const imageId = res.data?.deletePrizesByPk?.imageId || null;
      props.setBingoPrize((prev) =>
        prev.filter((p) => p.id !== selected.prize.id),
      );
      if (imageId) await deleteImage({ variables: { id: imageId } });
      toast.success("景品を削除しました");
    } catch (e) {
      console.error(e);
      toast.error("景品の削除に失敗しました");
    } finally {
      setSelected(null);
      setIsDeleteOpen(false);
    }
  };

  const openEdit = (p: GetListPrizesQuery["prizes"][number]) => {
    setSelected(toSelected(p));
    setIsEditOpen(true);
  };

  const submitEdit = async (params: {
    nameJp: string;
    nameEn: string;
    imageId?: number | null;
    image?: {
      id: number;
      bucketName: string;
      fileName: string;
      fileType: string;
    };
  }) => {
    if (!selected) return;
    const { nameJp, nameEn, imageId, image } = params;
    try {
      let data;

      // 新しい画像がアップロードされた場合
      if (imageId !== null && imageId !== undefined) {
        const result = await updatePrizeBasic({
          variables: {
            id: selected.prize.id,
            nameJp,
            nameEn,
            imageId,
          },
        });
        data = result.data;
      } else {
        // 名前のみ変更の場合
        const result = await updatePrizeNames({
          variables: {
            id: selected.prize.id,
            nameJp,
            nameEn,
          },
        });
        data = result.data;
      }
      if (data?.updatePrizesByPk) {
        props.setBingoPrize((prev) =>
          prev.map((p) =>
            p.id === selected.prize.id
              ? {
                  ...p,
                  nameJp,
                  nameEn,
                  image: image
                    ? {
                        ...p.image,
                        id: image.id,
                        bucketName: image.bucketName,
                        fileName: image.fileName,
                        fileType: image.fileType,
                        updatedAt: new Date(),
                      }
                    : p.image,
                }
              : p,
          ),
        );
        toast.success("景品を更新しました");
      }
    } catch (e) {
      console.error(e);
      toast.error("景品の更新に失敗しました");
    } finally {
      setSelected(null);
      setIsEditOpen(false);
    }
  };

  const sortedPrizes = useMemo(
    () => [...props.prizeResult].sort((a, b) => a.id - b.id),
    [props.prizeResult],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.title}>景品一覧</div>
        <div
          id="loading"
          className={isImageVisible ? styles.loading : styles.hidden}
        ></div>
        <div className={styles.grid}>
          {sortedPrizes.map((prizeResult) => (
            <div
              className={styles.card}
              key={prizeResult.id}
              id={`prize-${prizeResult.id}`}
            >
              <div className={styles.cardActions}>
                <button
                  aria-label="edit"
                  className={styles.iconBtn}
                  onClick={() => openEdit(prizeResult)}
                >
                  <IoCreateOutline />
                </button>
                <button
                  aria-label="delete"
                  className={styles.iconBtn}
                  onClick={() => openDelete(prizeResult)}
                >
                  <IoClose />
                </button>
              </div>
              <div className={styles.image}>
                <Image
                  src={getImageUrl(prizeResult)}
                  alt="PrizeImage"
                  fill
                  onLoad={imageVisibility}
                />
                {props.showOverlay && prizeResult.isWon && (
                  <div className={styles.overlay}>
                    <p className={styles.overlayText}>当選済み</p>
                  </div>
                )}
              </div>
              <div className={styles.cardContent}>
                <p>{prizeResult.nameJp}</p>
              </div>
              {props.showToggle && (
                <div className={styles.toggleContainer}>
                  <div className={styles.toggleButton}>
                    <input
                      id={`toggle-${prizeResult.id}`}
                      className={styles.toggleInput}
                      type="checkbox"
                      checked={prizeResult.isWon}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleToggleChange(prizeResult.id, e.target.checked)
                      }
                    />
                    <label
                      htmlFor={`toggle-${prizeResult.id}`}
                      className={styles.toggleLabel}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <PrizeDeleteModal
        isOpened={isDeleteOpen}
        setIsOpened={setIsDeleteOpen}
        prizeName={selected?.prize.nameJp}
        onConfirm={confirmDelete}
      />
      {selected && (
        <PrizeEditModal
          isOpened={isEditOpen}
          setIsOpened={setIsEditOpen}
          id={selected.prize.id}
          initialNameJp={selected.prize.nameJp}
          initialNameEn={selected.prize.nameEn}
          initialImageId={selected.image?.id ?? null}
          initialBucketName={selected.image?.bucketName ?? null}
          initialFileName={selected.image?.fileName ?? null}
          initialFileType={selected.image?.fileType ?? null}
          onSubmit={submitEdit}
        />
      )}
    </div>
  );
};

export default PrizeResult;
