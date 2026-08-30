import { sendAdminCommand, uploadPrizeImage } from "@/lib/admin-api";
import type { PrizeRow as PrizeWithImageUrl } from "@shared/bingo-transport";

interface PrizeMutationInput {
  nameJp: string;
  nameEn: string;
  file?: File | null;
}

interface PrizeUpdateInput extends PrizeMutationInput {
  id: number;
}

async function uploadOptionalImage(file?: File | null) {
  return file && file.size > 0 ? uploadPrizeImage(file) : null;
}

async function createPrize(input: PrizeMutationInput) {
  const image = await uploadOptionalImage(input.file);
  return sendAdminCommand<PrizeWithImageUrl>({
    type: "createPrize",
    nameJp: input.nameJp,
    nameEn: input.nameEn,
    ...(image ? { imagePath: image.image_path } : {}),
  });
}

async function updatePrize(input: PrizeUpdateInput) {
  const image = await uploadOptionalImage(input.file);
  return sendAdminCommand<PrizeWithImageUrl>({
    type: "updatePrize",
    id: input.id,
    nameJp: input.nameJp,
    nameEn: input.nameEn,
    ...(image ? { imagePath: image.image_path } : {}),
  });
}

export const prizeActions = {
  createPrize,
  updatePrize,
  togglePrizeWon: (id: number, isWon: boolean) =>
    sendAdminCommand<PrizeWithImageUrl>({ type: "togglePrizeWon", id, isWon }),
  reorderPrizeGroup: (orderedIds: number[]) =>
    sendAdminCommand<PrizeWithImageUrl[]>({ type: "reorderPrizeGroup", orderedIds }),
  deletePrize: (id: number) => sendAdminCommand<null>({ type: "deletePrize", id }),
};
