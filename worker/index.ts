import { requireAdmin, requireScreen, type AdminIdentity } from "./access";
import type { AdminCommand, BingoUnifiedState } from "../shared/bingo-transport";
import { makeStateEtag } from "../shared/state-etag";
import {
  assertPrizeImagePath,
  isClientId,
  isRecord,
  parseOptionalText,
  parsePositiveInteger,
  parseRequiredText,
  validationProblem,
} from "./domain";
import { GameState } from "./game-state";
import {
  ApiError,
  applySecurityHeaders,
  assertMethod,
  assertSameOriginMutation,
  assertWebSocketRequest,
  errorResponse,
  getSameOrigin,
  ifNoneMatch,
  jsonResponse,
  normalizeError,
  notModifiedResponse,
  preflightResponse,
  readJsonBody,
  sha256Hex,
} from "./http";
import { servePrizeImage, uploadPrizeImage } from "./images";
import { ReactionHub } from "./reaction-hub";
import { parseTurnstileToken, verifyTurnstileToken } from "./turnstile";

export { GameState, ReactionHub };

const GAME_STATE_NAME = "game";

const worker = {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    try {
      if (request.method === "OPTIONS") return preflightResponse(request);

      if (url.pathname === "/api/health" || url.pathname === "/api/ready") {
        return await handleHealth(request, env);
      }
      if (url.pathname.startsWith("/api/prize-images/")) {
        const encodedKey = url.pathname.slice("/api/prize-images/".length);
        let key: string;
        try {
          key = decodeURIComponent(encodedKey);
        } catch {
          throw new ApiError(404, "画像が見つかりません。");
        }
        return await servePrizeImage(request, env, key);
      }
      if (url.pathname === "/screen" || url.pathname.startsWith("/screen/")) {
        await requireScreen(request, env);
        return await handleScreenRoute(request, env);
      }
      if (url.pathname.startsWith("/admin")) {
        const identity = await requireAdmin(request, env);
        if (url.pathname.startsWith("/admin/api/")) {
          return await handleAdminApi(request, env, identity);
        }
        assertMethod(request, ["GET", "HEAD"]);
        return withStaticSecurityHeaders(await env.ASSETS.fetch(request));
      }

      switch (url.pathname) {
        case "/api/bingo/state":
          return await handlePublicState(request, env, "state");
        case "/api/bingo/prizes":
          return await handlePublicState(request, env, "prizes");
        case "/api/bingo/socket":
          return await handleStateSocket(request, env, "public");
        case "/api/bingo/reach":
          return await handlePublicReach(request, env);
        case "/api/bingo/stamps":
          return await handlePublicStamp(request, env);
        default:
          if (url.pathname.startsWith("/api/")) throw new ApiError(404, "APIが見つかりません。");
          assertMethod(request, ["GET", "HEAD"]);
          return await env.ASSETS.fetch(request);
      }
    } catch (error) {
      const normalized = normalizeError(error);
      if (normalized.status >= 500) {
        console.error(
          JSON.stringify({
            message: "worker request failed",
            requestId,
            method: request.method,
            path: url.pathname,
            status: normalized.status,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
      return errorResponse(normalized, safeRequestOrigin(request));
    }
  },
} satisfies ExportedHandler<Env>;

export default worker;

async function handleHealth(request: Request, env: Env): Promise<Response> {
  assertMethod(request, ["GET", "HEAD"]);
  const gameState = await getGameState(env).getStatus();
  return jsonResponse(
    {
      status: "ok",
      releaseSha: env.RELEASE_SHA,
      eventId: gameState.eventId,
      revision: gameState.revision,
      recoveryPending: gameState.recoveryPending,
      serverTime: new Date().toISOString(),
    },
    { status: 200 },
    { cacheControl: "no-store" },
  );
}

async function handleScreenRoute(request: Request, env: Env): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  switch (pathname) {
    case "/screen/api/state":
      return handlePublicState(request, env, "screen");
    case "/screen/api/socket":
      return handleStateSocket(request, env, "screen");
    case "/screen/api/stamps/socket":
      return handleStampSocket(request, env);
    default:
      if (pathname.startsWith("/screen/api/")) {
        throw new ApiError(404, "会場画面APIが見つかりません。");
      }
      assertMethod(request, ["GET", "HEAD"]);
      return withStaticSecurityHeaders(await env.ASSETS.fetch(request));
  }
}

async function handlePublicState(
  request: Request,
  env: Env,
  view: "state" | "prizes" | "screen",
): Promise<Response> {
  assertMethod(request, ["GET", "HEAD"]);
  const state = await getGameState(env).getState();
  const etag = makeStateEtag(state.revision);
  if (ifNoneMatch(request, etag)) return notModifiedResponse(etag);
  return jsonResponse(
    selectPublicView(state, view),
    { headers: { ETag: etag } },
    { cacheControl: "no-cache", requestOrigin: safeRequestOrigin(request) },
  );
}

function selectPublicView(state: BingoUnifiedState, view: "state" | "prizes" | "screen"): unknown {
  switch (view) {
    case "state":
      return state;
    case "prizes":
      return {
        revision: state.revision,
        prizes: state.prizes,
        appState: state.appState,
        serverTime: state.serverTime,
      };
    case "screen":
      return {
        revision: state.revision,
        numbers: state.numbers,
        appState: state.appState,
        latestReachLog: state.latestReachLog,
        serverTime: state.serverTime,
      };
  }
}

async function handleStateSocket(
  request: Request,
  env: Env,
  view: "public" | "screen",
): Promise<Response> {
  assertWebSocketRequest(request);
  const headers = internalWebSocketHeaders(request);
  headers.set("X-Bingo-View", view);
  return getGameState(env).fetch(new Request(request.url, { method: "GET", headers }));
}

async function handleStampSocket(request: Request, env: Env): Promise<Response> {
  assertWebSocketRequest(request);
  return env.REACTION_HUB.getByName("reactions").fetch(
    new Request(request.url, {
      method: "GET",
      headers: internalWebSocketHeaders(request),
    }),
  );
}

function internalWebSocketHeaders(request: Request): Headers {
  const headers = new Headers({ Upgrade: "websocket" });
  const origin = request.headers.get("Origin");
  if (origin !== null) headers.set("Origin", origin);
  const protocol = request.headers.get("Sec-WebSocket-Protocol");
  if (protocol !== null) headers.set("Sec-WebSocket-Protocol", protocol);
  return headers;
}

async function handlePublicReach(request: Request, env: Env): Promise<Response> {
  assertMethod(request, ["POST"]);
  const origin = assertSameOriginMutation(request);
  const body = await readJsonBody(request);
  if (!isRecord(body) || !isClientId(body.clientId)) {
    throw new ApiError(400, "clientId が不正です。");
  }
  const turnstileToken = parseTurnstileToken(body.turnstileToken);
  await verifyTurnstileToken(request, env, turnstileToken);
  const clientHash = await sha256Hex(body.clientId.toLowerCase());
  const count = await getGameState(env).recordPublicReach(clientHash);
  return jsonResponse({ data: count }, { status: 200 }, { requestOrigin: origin });
}

async function handlePublicStamp(request: Request, env: Env): Promise<Response> {
  assertMethod(request, ["POST"]);
  const origin = assertSameOriginMutation(request);
  const dailyLimit = parseStampDailyLimit(env.STAMP_DAILY_LIMIT);
  if (dailyLimit === 0) {
    return jsonResponse(
      { data: null, degraded: true, reason: "disabled" },
      { status: 202 },
      { requestOrigin: origin },
    );
  }
  const body = await readJsonBody(request);
  if (!isRecord(body) || !isClientId(body.clientId) || typeof body.stampName !== "string") {
    throw new ApiError(400, "リアクション送信内容が不正です。");
  }

  const clientHash = await sha256Hex(body.clientId.toLowerCase());
  const result = await env.REACTION_HUB.getByName("reactions").submitStamp(
    clientHash,
    body.stampName,
    dailyLimit,
  );
  if (result.accepted) {
    return jsonResponse({ data: result.stamp }, { status: 201 }, { requestOrigin: origin });
  }
  switch (result.reason) {
    case "sampled":
      return jsonResponse(
        { data: null, degraded: true, reason: "sampled" },
        { status: 202 },
        { requestOrigin: origin },
      );
    case "rate_limited":
      throw new ApiError(
        429,
        "短時間に送信しすぎています。少し待ってからもう一度お試しください。",
        result.retryAfterSeconds,
      );
    case "daily_limit":
      return jsonResponse(
        { data: null, degraded: true, reason: "daily_limit" },
        { status: 202 },
        { requestOrigin: origin },
      );
    case "overloaded":
      throw new ApiError(
        503,
        "混雑のためリアクション演出を一時的に簡略化しています。",
        result.retryAfterSeconds,
      );
  }
}

async function handleAdminApi(
  request: Request,
  env: Env,
  identity: AdminIdentity,
): Promise<Response> {
  const url = new URL(request.url);
  switch (url.pathname) {
    case "/admin/api/state": {
      assertMethod(request, ["GET"]);
      const state = await getGameState(env).getState();
      return jsonResponse({ data: state });
    }
    case "/admin/api/command":
      return handleAdminCommand(request, env, identity);
    case "/admin/api/images": {
      assertMethod(request, ["POST"]);
      const origin = assertSameOriginMutation(request);
      const image = await uploadPrizeImage(request, env);
      return jsonResponse({ data: image }, { status: 201 }, { requestOrigin: origin });
    }
    case "/admin/api/recovery":
    case "/admin/api/recovery/prepare":
    case "/admin/api/recovery/schedule":
    case "/admin/api/recovery/restart":
      return handleRecovery(request, env, identity);
    default:
      throw new ApiError(404, "管理APIが見つかりません。");
  }
}

async function handleRecovery(
  request: Request,
  env: Env,
  identity: AdminIdentity,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const game = getGameState(env);
  if (pathname === "/admin/api/recovery") {
    assertMethod(request, ["GET"]);
    return jsonResponse({ data: await game.getRecoveryStatus() });
  }

  assertMethod(request, ["POST"]);
  const origin = assertSameOriginMutation(request);
  const body = await readJsonBody(request);
  if (!isRecord(body)) throw new ApiError(400, "recovery body が不正です。");

  switch (pathname) {
    case "/admin/api/recovery/prepare":
      return jsonResponse(
        {
          data: await game.prepareRecovery(
            readString(body.targetTime, "targetTime"),
            readNonNegativeInteger(body.expectedRevision, "expectedRevision"),
          ),
        },
        { status: 200 },
        { requestOrigin: origin },
      );
    case "/admin/api/recovery/schedule":
      return jsonResponse(
        {
          data: await game.scheduleRecovery(
            identity.email,
            readString(body.targetBookmark, "targetBookmark"),
            readString(body.currentBookmark, "currentBookmark"),
            readNonNegativeInteger(body.expectedRevision, "expectedRevision"),
          ),
        },
        { status: 202 },
        { requestOrigin: origin },
      );
    case "/admin/api/recovery/restart":
      await game.restartForRecovery(readString(body.targetBookmark, "targetBookmark"));
      throw new Error("Durable Object restart unexpectedly returned");
    default:
      throw new ApiError(404, "recovery APIが見つかりません。");
  }
}

async function handleAdminCommand(
  request: Request,
  env: Env,
  identity: AdminIdentity,
): Promise<Response> {
  assertMethod(request, ["POST"]);
  const origin = assertSameOriginMutation(request);
  const body = await readJsonBody(request);
  if (!isRecord(body)) throw new ApiError(400, "command body が不正です。");
  const discriminator: AdminCommand["type"] =
    typeof body.type === "string"
      ? assertAdminCommandType(body.type)
      : assertAdminCommandType(body.command);

  const game = getGameState(env);
  let data: unknown;
  switch (discriminator) {
    case "createNumber":
      data = await game.createNumber(
        identity.email,
        parsePositiveInteger(body.number, "番号", { max: 99 }),
      );
      break;
    case "deleteNumber":
      data = await game.deleteNumber(
        identity.email,
        parsePositiveInteger(body.number, "番号", { max: 99 }),
      );
      break;
    case "updateNumber":
      data = await game.updateNumber(
        identity.email,
        parsePositiveInteger(body.id, "番号ID"),
        parsePositiveInteger(body.number, "番号", { max: 99 }),
      );
      break;
    case "incrementReach":
      data = await game.incrementReach(identity.email);
      break;
    case "decrementReach":
      data = await game.decrementReach(identity.email);
      break;
    case "saveSurveyState":
      data = await game.saveSurveyState(
        identity.email,
        readString(body.surveyUrl, "surveyUrl"),
        readBoolean(body.isSurveyActive, "isSurveyActive"),
      );
      break;
    case "startAnnualEvent":
      data = await game.startAnnualEvent(
        identity.email,
        readNonNegativeInteger(body.expectedRevision, "expectedRevision"),
        readString(body.expectedEventId, "expectedEventId"),
        readString(body.newEventId, "newEventId"),
      );
      break;
    case "createPrize": {
      const imagePath = body.imagePath;
      if (imagePath !== undefined) assertPrizeImagePath(imagePath);
      data = await game.createPrize(
        identity.email,
        parseRequiredText(body.nameJp, "景品名", 120),
        parseOptionalText(body.nameEn, "英語景品名", 160),
        imagePath,
      );
      break;
    }
    case "updatePrize": {
      const imagePath = body.imagePath;
      if (imagePath !== undefined) assertPrizeImagePath(imagePath);
      data = await game.updatePrize(
        identity.email,
        parsePositiveInteger(body.id, "景品ID"),
        parseRequiredText(body.nameJp, "景品名", 120),
        parseOptionalText(body.nameEn, "英語景品名", 160),
        imagePath,
      );
      break;
    }
    case "togglePrizeWon":
      data = await game.togglePrizeWon(
        identity.email,
        parsePositiveInteger(body.id, "景品ID"),
        readBoolean(body.isWon, "isWon"),
      );
      break;
    case "reorderPrizeGroup":
      if (!Array.isArray(body.orderedIds)) validationProblem("orderedIds が不正です。");
      data = await game.reorderPrizeGroup(
        identity.email,
        body.orderedIds.map((id) => parsePositiveInteger(id, "景品ID")),
      );
      break;
    case "deletePrize":
      data = await game.deletePrize(identity.email, parsePositiveInteger(body.id, "景品ID"));
      break;
    default:
      return assertNever(discriminator);
  }
  return jsonResponse({ data }, { status: 200 }, { requestOrigin: origin });
}

function getGameState(env: Env): DurableObjectStub<GameState> {
  return env.GAME_STATE.getByName(GAME_STATE_NAME);
}
function withStaticSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  applySecurityHeaders(headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function safeRequestOrigin(request: Request): string | null {
  try {
    return getSameOrigin(request);
  } catch {
    return null;
  }
}

function parseStampDailyLimit(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? Math.min(parsed, 25_000) : 25_000;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new ApiError(400, `${label} が不正です。`);
  return value;
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new ApiError(400, `${label} が不正です。`);
  return value;
}

function readNonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new ApiError(400, `${label} が不正です。`);
  }
  return value as number;
}

const ADMIN_COMMAND_TYPES = new Set<AdminCommand["type"]>([
  "createNumber",
  "deleteNumber",
  "updateNumber",
  "incrementReach",
  "decrementReach",
  "saveSurveyState",
  "startAnnualEvent",
  "createPrize",
  "updatePrize",
  "togglePrizeWon",
  "reorderPrizeGroup",
  "deletePrize",
]);

function assertAdminCommandType(value: unknown): AdminCommand["type"] {
  if (typeof value !== "string" || !ADMIN_COMMAND_TYPES.has(value as AdminCommand["type"])) {
    throw new ApiError(400, "command type が不正です。");
  }
  return value as AdminCommand["type"];
}

function assertNever(value: never): never {
  throw new ApiError(400, `未対応のcommandです: ${String(value)}`);
}
