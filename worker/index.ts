import { requireAdmin, requireScreen, type AdminIdentity } from "./access";
import type { AdminCommand, BingoUnifiedState } from "../shared/bingo-transport";
import {
  assertPrizeImagePath,
  isClientId,
  isGeneration,
  isRecord,
  parseOptionalText,
  parsePositiveInteger,
  parseRequiredText,
  validationProblem,
} from "./domain";
import { GameDirectory } from "./game-directory";
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
  makeStateEtag,
  normalizeError,
  notModifiedResponse,
  preflightResponse,
  readJsonBody,
  sha256Hex,
} from "./http";
import { servePrizeImage, uploadPrizeImage } from "./images";
import { ReactionHub } from "./reaction-hub";
import { createActiveSnapshot, listSnapshots } from "./snapshots";
import { SNAPSHOT_ADMIN_IDENTITY_HEADER } from "./snapshot-admin";
import { parseTurnstileToken, verifyTurnstileToken } from "./turnstile";

export { GameDirectory, GameState, ReactionHub };

type ActiveGame = {
  generation: string;
  state: DurableObjectStub<GameState>;
};

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

  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const snapshot = await createActiveSnapshot(env);
    console.log(
      JSON.stringify({
        message: "scheduled game snapshot created",
        cron: controller.cron,
        scheduledTime: controller.scheduledTime,
        key: snapshot.key,
        generation: snapshot.generation,
        revision: snapshot.revision,
      }),
    );
  },
} satisfies ExportedHandler<Env>;

export default worker;

async function handleHealth(request: Request, env: Env): Promise<Response> {
  assertMethod(request, ["GET", "HEAD"]);
  const directory = env.GAME_DIRECTORY.getByName("active");
  const directoryStatus = await directory.getStatus();
  const state = env.GAME_STATE.getByName(`game:${directoryStatus.generation}`);
  const gameState = await state.getStatus(directoryStatus.generation);
  return jsonResponse(
    {
      status: "ok",
      releaseSha: env.RELEASE_SHA,
      generation: gameState.generation,
      revision: gameState.revision,
      directoryVersion: directoryStatus.version,
      pendingRedirects: directoryStatus.pendingRedirects,
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
  const active = await getActiveGame(env);
  const status = await active.state.getStatus(active.generation);
  const etag = makeStateEtag(status.generation, status.revision);
  if (ifNoneMatch(request, etag)) return notModifiedResponse(etag);

  const state = await active.state.getState(active.generation);
  const currentEtag = makeStateEtag(state.generation, state.revision);
  const body = selectPublicView(state, view);
  return jsonResponse(
    body,
    { headers: { ETag: currentEtag } },
    { cacheControl: "no-cache", requestOrigin: safeRequestOrigin(request) },
  );
}

function selectPublicView(state: BingoUnifiedState, view: "state" | "prizes" | "screen"): unknown {
  switch (view) {
    case "state":
      return state;
    case "prizes":
      return {
        generation: state.generation,
        revision: state.revision,
        prizes: state.prizes,
        appState: state.appState,
        serverTime: state.serverTime,
      };
    case "screen":
      return {
        generation: state.generation,
        revision: state.revision,
        numbers: state.numbers,
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
  const active = await getActiveGame(env);
  const headers = internalWebSocketHeaders(request);
  headers.set("X-Bingo-Generation", active.generation);
  headers.set("X-Bingo-View", view);
  return active.state.fetch(new Request(request.url, { method: "GET", headers }));
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
  const active = await getActiveGame(env);
  const count = await active.state.recordPublicReach(active.generation, clientHash);
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
      const active = await getActiveGame(env);
      const state = await active.state.getState(active.generation);
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
    case "/admin/api/snapshots":
      return handleSnapshots(request, env);
    case "/admin/api/generations/activate":
      return handleActivate(request, env, identity);
    case "/admin/api/snapshots/restore":
    case "/admin/api/import":
      return handleSnapshotAdminMutation(request, env, identity);
    default:
      throw new ApiError(404, "管理APIが見つかりません。");
  }
}

async function handleSnapshotAdminMutation(
  request: Request,
  env: Env,
  identity: AdminIdentity,
): Promise<Response> {
  assertMethod(request, ["POST"]);
  assertSameOriginMutation(request);
  const headers = new Headers(request.headers);
  headers.delete("Authorization");
  headers.delete("Cookie");
  headers.delete("Cf-Access-Jwt-Assertion");
  headers.delete("X-Local-Admin-Email");
  headers.set(SNAPSHOT_ADMIN_IDENTITY_HEADER, identity.email);
  return env.GAME_DIRECTORY.getByName("active").fetch(new Request(request, { headers }));
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

  const active = await getActiveGame(env);
  let data: unknown;
  switch (discriminator) {
    case "createNumber":
      data = await active.state.createNumber(
        active.generation,
        identity.email,
        parsePositiveInteger(body.number, "番号", { max: 99 }),
      );
      break;
    case "deleteNumber":
      data = await active.state.deleteNumber(
        active.generation,
        identity.email,
        parsePositiveInteger(body.number, "番号", { max: 99 }),
      );
      break;
    case "updateNumber":
      data = await active.state.updateNumber(
        active.generation,
        identity.email,
        parsePositiveInteger(body.id, "番号ID"),
        parsePositiveInteger(body.number, "番号", { max: 99 }),
      );
      break;
    case "incrementReach":
      data = await active.state.incrementReach(active.generation, identity.email);
      break;
    case "decrementReach":
      data = await active.state.decrementReach(active.generation, identity.email);
      break;
    case "saveSurveyState":
      data = await active.state.saveSurveyState(
        active.generation,
        identity.email,
        readString(body.surveyUrl, "surveyUrl"),
        readBoolean(body.isSurveyActive, "isSurveyActive"),
      );
      break;
    case "createPrize": {
      const imagePath = body.imagePath;
      if (imagePath !== undefined) assertPrizeImagePath(imagePath);
      data = await active.state.createPrize(
        active.generation,
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
      data = await active.state.updatePrize(
        active.generation,
        identity.email,
        parsePositiveInteger(body.id, "景品ID"),
        parseRequiredText(body.nameJp, "景品名", 120),
        parseOptionalText(body.nameEn, "英語景品名", 160),
        imagePath,
      );
      break;
    }
    case "togglePrizeWon":
      data = await active.state.togglePrizeWon(
        active.generation,
        identity.email,
        parsePositiveInteger(body.id, "景品ID"),
        readBoolean(body.isWon, "isWon"),
      );
      break;
    case "reorderPrizeGroup":
      if (!Array.isArray(body.orderedIds)) validationProblem("orderedIds が不正です。");
      data = await active.state.reorderPrizeGroup(
        active.generation,
        identity.email,
        body.orderedIds.map((id) => parsePositiveInteger(id, "景品ID")),
      );
      break;
    case "deletePrize":
      data = await active.state.deletePrize(
        active.generation,
        identity.email,
        parsePositiveInteger(body.id, "景品ID"),
      );
      break;
    default:
      return assertNever(discriminator);
  }
  return jsonResponse({ data }, { status: 200 }, { requestOrigin: origin });
}

async function handleSnapshots(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    return jsonResponse({ data: await listSnapshots(env, cursor) });
  }
  if (request.method === "POST") {
    const origin = assertSameOriginMutation(request);
    return jsonResponse(
      { data: await createActiveSnapshot(env) },
      { status: 201 },
      { requestOrigin: origin },
    );
  }
  throw new ApiError(405, "許可されていないHTTPメソッドです。");
}

async function handleActivate(
  request: Request,
  env: Env,
  identity: AdminIdentity,
): Promise<Response> {
  assertMethod(request, ["POST"]);
  const origin = assertSameOriginMutation(request);
  const body = await readJsonBody(request);
  if (!isRecord(body)) throw new ApiError(400, "generation activate body が不正です。");
  const generation = readGeneration(body.generation, "generation");
  const hasExpectedGeneration = body.expectedGeneration !== undefined;
  const hasExpectedVersion = body.expectedVersion !== undefined;
  if (hasExpectedGeneration !== hasExpectedVersion) {
    throw new ApiError(400, "generation切り替えの期待値が不正です。");
  }
  const expected = hasExpectedGeneration
    ? {
        generation: readGeneration(body.expectedGeneration, "expectedGeneration"),
        version: parsePositiveInteger(body.expectedVersion, "expectedVersion"),
      }
    : undefined;
  const activation = await activateGeneration(env, generation, identity.email, expected);
  return jsonResponse({ data: activation }, { status: 200 }, { requestOrigin: origin });
}

async function activateGeneration(
  env: Env,
  generation: string,
  actor: string,
  expected?: { generation: string; version: number },
): Promise<Awaited<ReturnType<GameDirectory["activateGeneration"]>>> {
  const target = env.GAME_STATE.getByName(`game:${generation}`);
  if (!(await target.isInitialized(generation))) {
    throw new ApiError(404, "切り替え先generationが初期化されていません。");
  }

  const directory = env.GAME_DIRECTORY.getByName("active");
  if (expected === undefined) return directory.activateGeneration(generation, actor);

  const result = await directory.activateGenerationGuarded(
    generation,
    actor,
    expected.generation,
    expected.version,
  );
  if (!result.ok) {
    throw new ApiError(
      409,
      `active generationが ${result.generation}@${result.version} へ変更されています。`,
    );
  }
  return result.activation;
}

async function getActiveGame(env: Env): Promise<ActiveGame> {
  const generation = await env.GAME_DIRECTORY.getByName("active").getActiveGeneration();
  return {
    generation,
    state: env.GAME_STATE.getByName(`game:${generation}`),
  };
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

function readGeneration(value: unknown, label: string): string {
  if (!isGeneration(value)) throw new ApiError(400, `${label} が不正です。`);
  return value;
}

const ADMIN_COMMAND_TYPES = new Set<AdminCommand["type"]>([
  "createNumber",
  "deleteNumber",
  "updateNumber",
  "incrementReach",
  "decrementReach",
  "saveSurveyState",
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
