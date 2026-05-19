import { NextRequest, NextResponse } from "next/server";

import { getStampTriggersAfter } from "@/lib/queries";
import type { StampEventsResponse } from "@/types/bingo/polling";

function readPositiveInteger(value: string | null, fallback: number) {
  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

export async function GET(request: NextRequest) {
  const after = readPositiveInteger(request.nextUrl.searchParams.get("after"), 0);
  const limit = readPositiveInteger(request.nextUrl.searchParams.get("limit"), 50);
  const stamps = await getStampTriggersAfter(after, limit);
  const nextCursor = stamps.at(-1)?.id ?? after;
  const body: StampEventsResponse = {
    stamps,
    nextCursor,
    serverTime: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
