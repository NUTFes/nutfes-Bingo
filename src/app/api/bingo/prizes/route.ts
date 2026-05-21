import { unstable_rethrow } from "next/navigation";

import { getAppState, getPrizes } from "@/lib/queries";
import { jsonError, jsonWithEtag } from "@/lib/polling-server";
import type { PrizeStateResponse } from "@/types/bingo/polling";

const CACHE_CONTROL = "public, max-age=0, s-maxage=1, stale-while-revalidate=4";

export async function GET(request: Request) {
  try {
    const [prizes, appState] = await Promise.all([getPrizes(), getAppState()]);
    const body: PrizeStateResponse = {
      prizes,
      appState,
      serverTime: new Date().toISOString(),
    };

    return jsonWithEtag(request, body, CACHE_CONTROL, { prizes, appState });
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return jsonError("BINGO_PRIZES_FETCH_FAILED");
  }
}
