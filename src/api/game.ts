import { z } from 'zod';

const id = z.string().min(1);
const count = z.number().int().nonnegative();
const timestamp = z.number().int().nonnegative();
export const emotionSchema = z.object({ label: z.string(), displayName: z.string(), emoji: z.string(), color: z.string(), hint: z.string() });
export const scoredSchema = z.object({
  roundId: id, submissionId: id, participantId: id, nickname: z.string(), colorTag: count.max(11),
  status: z.enum(['submitted', 'no_face', 'failed']), targetScore: z.number().nullable(),
  topEmotions: z.array(z.object({ label: z.string(), score: z.number() })).nullable(),
  currentRank: z.number().int().positive().nullable(), mediaToken: id, scoredCount: count, scoredTotal: count,
});
export const roundResultSchema = z.object({
  participantId: id, rank: z.number().int().positive().nullable(), rankPoints: z.number(),
  totalPoints: z.number().optional(), targetScore: z.number().nullable().optional(),
  status: z.enum(['submitted', 'no_face', 'failed', 'missed']),
});
export const finalizedSchema = z.object({ roundId: id, results: z.array(roundResultSchema), viewingEndsAtMs: timestamp });
export const reactionSchema = z.object({ roundId: id, submissionId: id, like: count, question: count });
export const skipStatusSchema = z.object({ roundId: id, skipped: count, total: count });
export const finishedSchema = z.object({
  aborted: z.boolean(), reason: z.enum(['engine_unavailable', 'not_enough_players']).nullable(),
  ranking: z.array(z.object({ rank: z.number().int().positive(), participantId: id, nickname: z.string(), colorTag: count.max(11), totalPoints: z.number(), likeCount: count, questionCount: count })),
  mostLoved: z.object({ participantId: id, likeCount: count }).nullable(),
});
const roundIdentity = z.object({ roundId: id, index: z.number().int().positive() });
const captureRound = roundIdentity.extend({
  emotion: emotionSchema, status: z.enum(['revealed', 'capturing']), countdownEndsAtMs: timestamp,
  deadlineAtMs: timestamp, captureToken: id, viewingEndsAtMs: timestamp.nullable().optional(),
  mySubmission: z.object({ status: z.literal('none') }), activeCount: count.optional(),
});
const resultRound = roundIdentity.extend({
  status: z.enum(['capturing', 'scoring', 'finalized']), emotion: emotionSchema.optional(),
  viewingEndsAtMs: timestamp.nullable().optional(),
  mySubmission: z.object({ status: z.enum(['processing', 'submitted', 'no_face', 'failed']), submissionId: id.optional() }),
});
// Capture and missed fields follow BE §14. Result/final containers are an explicit
// integration contract in GAME_CONTRACT.md; the current backend only serves lobby.
export const gameSnapshotSchema = z.discriminatedUnion('screen', [
  z.object({ screen: z.literal('lobby') }),
  z.object({ screen: z.literal('lobby_waiting_next') }),
  z.object({ screen: z.literal('error_room_closed') }),
  z.object({ screen: z.literal('countdown'), currentRound: z.union([
    captureRound,
    roundIdentity.extend({ status: z.literal('voided'), nextRoundAtMs: timestamp }),
  ]) }),
  z.object({ screen: z.literal('capture'), currentRound: captureRound }),
  z.object({ screen: z.literal('result'), currentRound: resultRound,
    scoredSubmissions: z.array(scoredSchema), finalized: finalizedSchema.nullable(),
    reactions: z.array(reactionSchema), skipStatus: skipStatusSchema.nullable(),
  }),
  z.object({ screen: z.literal('round_missed'), currentRound: roundIdentity.extend({
    phase: z.enum(['scoring', 'viewing']), nextRoundAtMs: timestamp.optional(),
  }) }),
  finishedSchema.extend({ screen: z.literal('final') }),
]).superRefine((game, ctx) => {
  if ((game.screen === 'capture' || game.screen === 'countdown') && 'deadlineAtMs' in game.currentRound
    && game.currentRound.deadlineAtMs <= game.currentRound.countdownEndsAtMs) {
    ctx.addIssue({ code: 'custom', message: 'Invalid capture interval' });
  }
  if (game.screen === 'result') {
    const roundId = game.currentRound.roundId;
    if (game.scoredSubmissions.some((card) => card.roundId !== roundId)
      || (game.finalized && game.finalized.roundId !== roundId)
      || game.reactions.some((row) => row.roundId !== roundId)
      || (game.skipStatus && game.skipStatus.roundId !== roundId)) {
      ctx.addIssue({ code: 'custom', message: 'Mixed result rounds' });
    }
    if (new Set(game.scoredSubmissions.map((card) => card.participantId)).size !== game.scoredSubmissions.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate result participant' });
    }
  }
});
export const gameEventSchemas = {
  'game:started': z.object({ roundCount: z.number().int().positive(), timeLimitSec: z.number().positive(), participantIds: z.array(id) }),
  'round:revealed': roundIdentity.extend({ roundCount: z.number().int().positive(), emotion: emotionSchema, countdownEndsAtMs: timestamp, deadlineAtMs: timestamp, captureToken: id, activeCount: count }),
  'submission:status': z.object({ roundId: id, submitted: count, total: count }),
  'submission:scored': scoredSchema,
  'round:finalized': finalizedSchema,
  'round:missed': roundIdentity.extend({ roundCount: z.number().int().positive(), phase: z.literal('scoring') }),
  'round:missedUpdate': z.object({ roundId: id, phase: z.literal('viewing'), nextRoundAtMs: timestamp }),
  'reaction:updated': reactionSchema,
  'round:skipStatus': skipStatusSchema,
  'round:closed': z.object({ roundId: id, nextRoundAtMs: timestamp,
    reactions: z.array(z.object({ submissionId: id, like: count, question: count })),
    results: z.array(z.object({ participantId: id, rankPoints: z.number(), totalPoints: z.number() })),
  }),
  'round:voided': roundIdentity.extend({ reason: z.literal('engine_unavailable'), nextRoundAtMs: timestamp }),
  'game:finished': finishedSchema,
};
export type GameEventName = keyof typeof gameEventSchemas;
export type GameEvent = { [K in GameEventName]: { type: K; payload: z.infer<typeof gameEventSchemas[K]> } }[GameEventName];
export function parseGameEvent(type: GameEventName, payload: unknown): GameEvent | null {
  const parsed = gameEventSchemas[type].safeParse(payload);
  return parsed.success ? { type, payload: parsed.data } as GameEvent : null;
}
export type GameSnapshot = z.infer<typeof gameSnapshotSchema>;
export type ScoredSubmission = z.infer<typeof scoredSchema>;
export type RoundResult = z.infer<typeof roundResultSchema>;
export type GameFinished = z.infer<typeof finishedSchema>;
