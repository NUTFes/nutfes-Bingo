/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { GameDirectory, GameState, ReactionHub } from "../worker";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    GAME_DIRECTORY: DurableObjectNamespace<GameDirectory>;
    GAME_STATE: DurableObjectNamespace<GameState>;
    REACTION_HUB: DurableObjectNamespace<ReactionHub>;
  }
}
