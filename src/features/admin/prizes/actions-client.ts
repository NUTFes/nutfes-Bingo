import { sendAdminCommand, uploadPrizeImage } from "@/lib/admin-api";
import { toActionResult } from "@/types/action-result";
import type { PrizeWithImageUrl } from "@/types/bingo/types";

type CreatePrizeInput = {
  nameJp: string;
  nameEn: string;
  file?: File | null;
};

type UpdatePrizeInput = CreatePrizeInput & { id: number };

async function uploadOptionalImage(file?: File | null) {
  return file && file.size > 0 ? uploadPrizeImage(file) : null;
}

async function createPrize(input: CreatePrizeInput) {
  const image = await uploadOptionalImage(input.file);
  return sendAdminCommand<PrizeWithImageUrl>({
    type: "createPrize",
    nameJp: input.nameJp,
    nameEn: input.nameEn,
    ...(image ? { imagePath: image.image_path } : {}),
  });
}

async function updatePrize(input: UpdatePrizeInput) {
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
  createPrize: (input: CreatePrizeInput) => toActionResult(() => createPrize(input)),
  updatePrize: (input: UpdatePrizeInput) => toActionResult(() => updatePrize(input)),
  togglePrizeWon: (id: number, isWon: boolean) =>
    toActionResult(() =>
      sendAdminCommand<PrizeWithImageUrl>({ type: "togglePrizeWon", id, isWon }),
    ),
  reorderPrizeGroup: (orderedIds: number[]) =>
    toActionResult(() =>
      sendAdminCommand<PrizeWithImageUrl[]>({ type: "reorderPrizeGroup", orderedIds }),
    ),
  deletePrize: (id: number) =>
    toActionResult(() => sendAdminCommand<null>({ type: "deletePrize", id })),
};
