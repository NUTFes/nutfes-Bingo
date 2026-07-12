import { z } from "zod/v4";

import { REACTION_NAMES } from "./protocol";

export const featureFlagsSchema = z.object({
  reactionsEnabled: z.boolean(),
  reachSubmissionEnabled: z.boolean(),
  surveyEnabled: z.boolean(),
  adminWritesEnabled: z.boolean(),
  readOnlyMode: z.boolean(),
});

export const prizeSchema = z.object({
  id: z.number().int().positive(),
  nameJa: z.string(),
  nameEn: z.string(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isWon: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});

export const bingoSnapshotSchema = z.object({
  type: z.literal("snapshot"),
  version: z.number().int().nonnegative(),
  eventId: z.string(),
  numbers: z.array(
    z.object({ id: z.number().int().positive(), number: z.number().int().min(1).max(99) }),
  ),
  latestNumber: z.number().int().min(1).max(99).nullable(),
  reachCount: z.number().int().nonnegative(),
  survey: z.object({ active: z.boolean(), url: z.string() }),
  prizes: z.array(prizeSchema),
  flags: featureFlagsSchema,
});

const eventTypeSchema = z.enum([
  "number.added",
  "number.updated",
  "number.deleted",
  "numbers.reset",
  "reach.updated",
  "reach.reset",
  "survey.updated",
  "prizes.updated",
  "flags.updated",
  "event.initialized",
]);

export const serverEventSchema = z.object({
  type: eventTypeSchema,
  version: z.number().int().nonnegative(),
  payload: z.unknown(),
});

export const bingoSocketMessageSchema = z.union([
  bingoSnapshotSchema,
  serverEventSchema,
  z.object({ type: z.literal("pong"), version: z.number().int().nonnegative() }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
]);
export const bingoClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("resync"), lastVersion: z.number().int().nonnegative() }),
]);

const prizeInputSchema = z.object({
  nameJa: z.string(),
  nameEn: z.string(),
  imageKey: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isWon: z.boolean(),
});

const bingoNumberInputSchema = z.number().int().min(1).max(99);
const positiveIdSchema = z.number().int().positive();

export const adminCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("number.add"), number: bingoNumberInputSchema }),
  z.object({
    type: z.literal("number.update"),
    id: positiveIdSchema,
    number: bingoNumberInputSchema,
  }),
  z.object({ type: z.literal("number.delete"), id: positiveIdSchema }),
  z.object({ type: z.literal("numbers.reset") }),
  z.object({ type: z.literal("reach.increment") }),
  z.object({ type: z.literal("reach.decrement") }),
  z.object({ type: z.literal("reach.reset") }),
  z.object({ type: z.literal("survey.update"), active: z.boolean(), url: z.string() }),
  z.object({ type: z.literal("prize.create"), prize: prizeInputSchema }),
  z.object({
    type: z.literal("prize.update"),
    id: positiveIdSchema,
    prize: prizeInputSchema.partial(),
    expectedImageKey: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("prize.delete"),
    id: positiveIdSchema,
    expectedImageKey: z.string().nullable().optional(),
  }),
  z.object({ type: z.literal("prize.toggleWon"), id: positiveIdSchema, isWon: z.boolean() }),
  z.object({ type: z.literal("prize.reorder"), ids: z.array(positiveIdSchema) }),
  z.object({ type: z.literal("flags.update"), flags: featureFlagsSchema.partial() }),
  z.object({ type: z.literal("event.initialize") }),
]);

export const reactionClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("reaction"), name: z.enum(REACTION_NAMES) }),
]);

export const reactionBatchSchema = z.object({
  type: z.literal("reaction.batch"),
  reactions: z.array(z.object({ name: z.enum(REACTION_NAMES), at: z.number() })),
});

export const sessionResponseSchema = z.object({
  ready: z.literal(true),
  eventId: z.string(),
  reactionShards: z.number().int().min(1).max(16),
});

export const reachResponseSchema = z.object({
  accepted: z.boolean(),
  count: z.number().int().nonnegative(),
});
export const adminSessionSchema = z.object({ authenticated: z.literal(true) });
export const errorResponseSchema = z.object({ error: z.string() });
