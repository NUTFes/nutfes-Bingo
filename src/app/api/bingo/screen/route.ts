import { unstable_rethrow } from "next/navigation";

import { getLatestReachLog, getNumbers } from "@/lib/queries";
import { jsonError, jsonWithEtag } from "@/lib/polling-server";
import type { ScreenStateResponse } from "@/types/bingo/polling";

const CACHE_CONTROL = "public, max-age=0, s-maxage=1, stale-while-revalidate=4";

export async function GET(request: Request) {
  try {
    const [numbers, latestReachLog] = await Promise.all([getNumbers(), getLatestReachLog()]);
    const body: ScreenStateResponse = {
      numbers,
      latestReachLog,
      serverTime: new Date().toISOString(),
    };

    return jsonWithEtag(request, body, CACHE_CONTROL, { numbers, latestReachLog });
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return jsonError("BINGO_SCREEN_FETCH_FAILED");
  }
}
