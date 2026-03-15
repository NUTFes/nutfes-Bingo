import {
  createNumber,
  decrementReach,
  deleteNumber,
  incrementReach,
  saveSurveyState,
  updateNumber,
} from "./actions";
import { logout } from "@/features/admin/auth/actions";
import { toActionResult } from "@/shared/domain/action-result";

export const dashboardActions = {
  createNumber: (number: number) => toActionResult(async () => createNumber(number)),
  deleteNumber: (number: number) => toActionResult(async () => deleteNumber(number)),
  updateNumber: (id: number, number: number) =>
    toActionResult(async () => updateNumber(id, number)),
  incrementReach: () => toActionResult(async () => incrementReach()),
  decrementReach: () => toActionResult(async () => decrementReach()),
  saveSurveyState: (input: { surveyUrl: string; isSurveyActive: boolean }) =>
    toActionResult(async () => saveSurveyState(input)),
  logout,
};
