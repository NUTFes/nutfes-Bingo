import { sendAdminCommand, uploadPrizeImage } from "@/lib/admin-api";
import { toActionResult } from "@/types/action-result";
import type { PrizeWithImageUrl } from "@/types/bingo/types";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFile(formData: FormData) {
  const value = formData.get("file");
  return value instanceof File && value.size > 0 ? value : null;
}

async function uploadOptionalImage(formData: FormData) {
  const file = getFile(formData);
  return file ? uploadPrizeImage(file) : null;
}

async function createPrize(formData: FormData) {
  const image = await uploadOptionalImage(formData);
  return sendAdminCommand<PrizeWithImageUrl>({
    type: "createPrize",
    nameJp: getString(formData, "nameJp"),
    nameEn: getString(formData, "nameEn"),
    ...(image ? { imagePath: image.image_path } : {}),
  });
}

async function updatePrize(formData: FormData) {
  const image = await uploadOptionalImage(formData);
  return sendAdminCommand<PrizeWithImageUrl>({
    type: "updatePrize",
    id: Number(getString(formData, "id")),
    nameJp: getString(formData, "nameJp"),
    nameEn: getString(formData, "nameEn"),
    ...(image ? { imagePath: image.image_path } : {}),
  });
}

export const prizeActions = {
  createPrize: (formData: FormData) => toActionResult(() => createPrize(formData)),
  updatePrize: (formData: FormData) => toActionResult(() => updatePrize(formData)),
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
