import "server-only";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hasMatchingEtag(ifNoneMatch: string | null, etag: string) {
  if (!ifNoneMatch) {
    return false;
  }

  return ifNoneMatch
    .split(",")
    .map((candidate) => candidate.trim())
    .some((candidate) => candidate === etag || candidate === "*");
}

export async function jsonWithEtag<T>(
  request: Request,
  body: T,
  cacheControl: string,
  etagSource: unknown = body,
) {
  const json = JSON.stringify(body);
  const etag = `"${await sha256(JSON.stringify(etagSource))}"`;
  const headers = new Headers({
    "Cache-Control": cacheControl,
    ETag: etag,
  });

  if (hasMatchingEtag(request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(json, {
    status: 200,
    headers,
  });
}

export function jsonError(error: string, status = 503) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
