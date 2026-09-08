import type { GameEvent, GameFinished, GameSnapshot, RoundResult, ScoredSubmission } from '../api/game';

type Round = { roundId: string; index: number };
export type Emotion = { label: string; displayName: string; emoji: string; color: string; hint: string };
export type CaptureGame = Round & {
  screen: 'countdown' | 'capture'; emotion: Emotion;
  countdownEndsAtMs: number; deadlineAtMs: number; captureToken: string; submitted: number; total: number;
};
export type ResultGame = Round & {
  screen: 'result'; cards: ScoredSubmission[]; results: RoundResult[]; finalized: boolean;
  viewingEndsAtMs: number | null; reactions: Record<string, { like: number; question: number }>;
  skipStatus: { skipped: number; total: number } | null; emotion?: Emotion;
};
export type GameView = CaptureGame | ResultGame
  | (Round & { screen: 'round_missed'; phase: 'scoring' | 'viewing'; nextRoundAtMs?: number })
  | (Round & { screen: 'waiting'; reason: 'closed' | 'voided'; nextRoundAtMs: number })
  | { screen: 'starting' } | { screen: 'lobby_waiting_next' }
  | ({ screen: 'final' } & GameFinished);

export function resultView(round: Round & { emotion?: Emotion }): ResultGame {
  return { screen: 'result', roundId: round.roundId, index: round.index, emotion: round.emotion, cards: [], results: [], finalized: false, viewingEndsAtMs: null, reactions: {}, skipStatus: null };
}
export function restoreGame(game: GameSnapshot | null, activeCount: number): GameView | null {
  if (!game || game.screen === 'lobby' || game.screen === 'error_room_closed') return null;
  if (game.screen === 'final' || game.screen === 'lobby_waiting_next') return game;
  if (game.screen === 'round_missed') return { ...game.currentRound, screen: 'round_missed' };
  if (game.screen === 'result') {
    const current = game.currentRound;
    return { ...resultView(current), cards: game.scoredSubmissions.filter((card) => card.roundId === current.roundId),
      results: game.finalized?.roundId === current.roundId ? game.finalized.results : [],
      finalized: game.finalized?.roundId === current.roundId,
      viewingEndsAtMs: game.finalized?.roundId === current.roundId ? game.finalized.viewingEndsAtMs : current.viewingEndsAtMs ?? null,
      reactions: Object.fromEntries(game.reactions.filter((item) => item.roundId === current.roundId).map((item) => [item.submissionId, { like: item.like, question: item.question }])),
      skipStatus: game.skipStatus?.roundId === current.roundId ? game.skipStatus : null,
    };
  }
  const round = game.currentRound;
  if (round.status === 'voided') return { screen: 'waiting', roundId: round.roundId, index: round.index, reason: 'voided', nextRoundAtMs: round.nextRoundAtMs };
  if (!('captureToken' in round)) return null;
  return { ...round, screen: game.screen, submitted: 0, total: round.activeCount ?? activeCount };
}

// Every update is assignment/upsert, never client-side point or rank calculation.
export function reduceGame(current: GameView | null, event: GameEvent): GameView | null {
  if (current?.screen === 'final') return current;
  if (event.type === 'game:finished') return { screen: 'final', ...event.payload };
  if (event.type === 'game:started') return current ?? { screen: 'starting' };
  if (event.type === 'round:revealed') {
    const next = event.payload;
    if (current && 'index' in current && next.index <= current.index) return current;
    if (current?.screen === 'lobby_waiting_next') return current;
    return { ...next, screen: 'countdown', submitted: 0, total: next.activeCount };
  }
  if (!current || !('roundId' in current) || current.roundId !== event.payload.roundId) return current;
  switch (event.type) {
    case 'submission:status':
      return current.screen === 'capture' || current.screen === 'countdown'
        ? { ...current, submitted: event.payload.submitted, total: event.payload.total } : current;
    case 'round:missed':
      return current.screen === 'capture' || current.screen === 'countdown'
        ? { screen: 'round_missed', roundId: current.roundId, index: current.index, phase: event.payload.phase } : current;
    case 'round:missedUpdate':
      return current.screen === 'round_missed' ? { ...current, phase: 'viewing', nextRoundAtMs: event.payload.nextRoundAtMs } : current;
    case 'round:voided':
    case 'round:closed':
      return { screen: 'waiting', roundId: current.roundId, index: current.index,
        reason: event.type === 'round:voided' ? 'voided' : 'closed', nextRoundAtMs: event.payload.nextRoundAtMs };
    case 'submission:scored':
      if (current.screen !== 'result') return current;
      return { ...current, cards: current.cards.some((card) => card.submissionId === event.payload.submissionId)
        ? current.cards.map((card) => card.submissionId === event.payload.submissionId ? event.payload : card)
        : [...current.cards, event.payload] };
    case 'round:finalized':
      return current.screen === 'result' ? { ...current, results: event.payload.results, finalized: true, viewingEndsAtMs: event.payload.viewingEndsAtMs } : current;
    case 'reaction:updated':
      return current.screen === 'result' ? { ...current, reactions: { ...current.reactions, [event.payload.submissionId]: { like: event.payload.like, question: event.payload.question } } } : current;
    case 'round:skipStatus':
      return current.screen === 'result' ? { ...current, skipStatus: event.payload } : current;
  }
}
