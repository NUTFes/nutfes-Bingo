import { sendAdminCommand } from "@/lib/admin-api";
import type { AppStateRow, NumberRow } from "@shared/bingo-transport";

export const dashboardActions = {
  createNumber: (number: number) => sendAdminCommand<NumberRow>({ type: "createNumber", number }),
  deleteNumber: (number: number) => sendAdminCommand<NumberRow>({ type: "deleteNumber", number }),
  updateNumber: (id: number, number: number) =>
    sendAdminCommand<NumberRow>({ type: "updateNumber", id, number }),
  incrementReach: () => sendAdminCommand<number>({ type: "incrementReach" }),
  decrementReach: () => sendAdminCommand<number>({ type: "decrementReach" }),
  saveSurveyState: (input: {
    surveyUrl: string;
    surveyTitle: string;
    surveyDescription: string;
    surveyButtonLabel: string;
    isSurveyActive: boolean;
  }) =>
    sendAdminCommand<AppStateRow>({
      type: "saveSurveyState",
      ...input,
    }),
  startAnnualEvent: (input: {
    expectedRevision: number;
    expectedEventId: string;
    newEventId: string;
  }) =>
    sendAdminCommand<{ eventId: string; revision: number }>({
      type: "startAnnualEvent",
      ...input,
    }),
  logout: async () => {
    window.location.assign("/cdn-cgi/access/logout");
  },
};
