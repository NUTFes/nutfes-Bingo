import { getAppState, getNumbers } from "@/lib/queries";
import { jsonWithEtag } from "@/lib/polling-server";
import type { BingoStateResponse } from "@/types/bingo/polling";

const CACHE_CONTROL = "public, max-age=0, s-maxage=1, stale-while-revalidate=4";

export async function GET(request: Request) {
  const [numbers, appState] = await Promise.all([getNumbers(), getAppState()]);
  const body: BingoStateResponse = {
    numbers,
    appState,
    serverTime: new Date().toISOString(),
  };

  return jsonWithEtag(request, body, CACHE_CONTROL, { numbers, appState });
}
