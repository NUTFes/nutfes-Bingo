import {
  createPrize,
  deletePrize,
  reorderPrizeGroup,
  togglePrizeWon,
  updatePrize,
} from "./actions";
import { toActionResult } from "@/types/action-result";

export const prizeActions = {
  createPrize: (formData: FormData) => toActionResult(async () => createPrize(formData)),
  updatePrize: (formData: FormData) => toActionResult(async () => updatePrize(formData)),
  togglePrizeWon: (id: number, isWon: boolean) =>
    toActionResult(async () => togglePrizeWon(id, isWon)),
  reorderPrizeGroup: (orderedIds: number[]) =>
    toActionResult(async () => reorderPrizeGroup(orderedIds)),
  deletePrize: (id: number) => toActionResult(async () => deletePrize(id)),
};
