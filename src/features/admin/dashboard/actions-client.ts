import { sendAdminCommand } from "@/lib/admin-api";
import type { AppStateRow, NumberRow } from "@/types/bingo/types";
import { toActionResult } from "@/types/action-result";

export const dashboardActions = {
  createNumber: (number: number) =>
    toActionResult(() => sendAdminCommand<NumberRow>({ type: "createNumber", number })),
  deleteNumber: (number: number) =>
    toActionResult(() => sendAdminCommand<NumberRow>({ type: "deleteNumber", number })),
  updateNumber: (id: number, number: number) =>
    toActionResult(() => sendAdminCommand<NumberRow>({ type: "updateNumber", id, number })),
  incrementReach: () => toActionResult(() => sendAdminCommand<number>({ type: "incrementReach" })),
  decrementReach: () => toActionResult(() => sendAdminCommand<number>({ type: "decrementReach" })),
  saveSurveyState: (input: { surveyUrl: string; isSurveyActive: boolean }) =>
    toActionResult(() =>
      sendAdminCommand<AppStateRow>({
        type: "saveSurveyState",
        surveyUrl: input.surveyUrl,
        isSurveyActive: input.isSurveyActive,
      }),
    ),
  logout: async () => {
    window.location.assign("/cdn-cgi/access/logout");
  },
};
