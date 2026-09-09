import { afterEach, describe, expect, it } from 'vitest';
import { gameSnapshotSchema, parseGameEvent } from '../api/game';
import { roomStateSchema, toLobbySnapshot } from '../api/roomEntry';
import { captureSnapshotFixture, finalizedFixture, finishedFixture, resultSnapshotFixture, revealedFixture, scoredFixture } from '../tests/fixtures/game';
import { roomJoinedFixture } from '../tests/fixtures/room';
import { reduceGame, restoreGame } from './gameState';
import { useRoomStore } from './roomStore';
const event = (type: Parameters<typeof parseGameEvent>[0], payload: unknown) => {
  const parsed = parseGameEvent(type, payload);
  if (!parsed) throw new Error('Invalid test fixture');
  return parsed;
};
afterEach(() => useRoomStore.getState().clear());
describe('game state transitions', () => {
  it('공개 → 접수 → 결과 → 종료 → 다음 라운드 → 최종 순위를 연결한다', () => {
    const store = useRoomStore.getState();
    store.hydrate(toLobbySnapshot(roomStateSchema.parse({ ...roomJoinedFixture, serverTimeMs: 1 })));
    store.setConnection('connected');
    store.applyGameEvent(event('game:started', { roundCount: 5, timeLimitSec: 20, participantIds: ['41', '42'] }));
    expect(useRoomStore.getState().game?.screen).toBe('starting');
    store.applyGameEvent(event('round:revealed', revealedFixture));
    expect(store.beginUpload('87')).toBe(true);
    expect(store.beginUpload('87')).toBe(false);
    // Viewer events can beat a slow 202 response. They stay hidden until acceptance.
    store.applyGameEvent(event('submission:scored', scoredFixture));
    expect(useRoomStore.getState().game?.screen).toBe('countdown');
    store.acceptUpload('87');
    expect(useRoomStore.getState().game).toMatchObject({ screen: 'result', cards: [scoredFixture] });
    store.applyGameEvent(event('round:finalized', finalizedFixture));
    store.applyGameEvent(event('round:finalized', finalizedFixture));
    expect(useRoomStore.getState().game).toMatchObject({ results: finalizedFixture.results });
    store.applyGameEvent(event('round:closed', { roundId: '87', nextRoundAtMs: 1757203381000, reactions: [], results: [] }));
    expect(JSON.stringify(useRoomStore.getState())).not.toContain('test-media-token');
    expect(JSON.stringify(useRoomStore.getState())).not.toContain('test-capture-token');
    store.applyGameEvent(event('round:revealed', { ...revealedFixture, roundId: '88', index: 4 }));
    store.applyGameEvent(event('submission:scored', scoredFixture));
    store.acceptUpload('87');
    expect(useRoomStore.getState().game).toMatchObject({ roundId: '88', screen: 'countdown' });
    store.applyGameEvent(event('game:finished', finishedFixture));
    store.applyGameEvent(event('round:revealed', { ...revealedFixture, index: 5 }));
    expect(useRoomStore.getState().game).toEqual({ screen: 'final', ...finishedFixture });
  });
  it('미제출자는 감정·사진·점수가 제거된 대기 상태만 받는다', () => {
    let game = restoreGame(gameSnapshotSchema.parse(captureSnapshotFixture.game), 5);
    game = reduceGame(game, event('submission:scored', scoredFixture));
    expect(game?.screen).toBe('capture');
    game = reduceGame(game, event('round:missed', { roundId: '87', index: 3, roundCount: 5, phase: 'scoring' }));
    game = reduceGame(game, event('submission:scored', scoredFixture));
    game = reduceGame(game, event('round:missedUpdate', { roundId: '87', phase: 'viewing', nextRoundAtMs: 123 }));
    expect(game).toEqual({ screen: 'round_missed', roundId: '87', index: 3, phase: 'viewing', nextRoundAtMs: 123 });
  });
  it('촬영 중에는 다른 사람의 결과가 상태에 저장되지 않는다', () => {
    const store = useRoomStore.getState();
    store.hydrate(toLobbySnapshot(roomStateSchema.parse(captureSnapshotFixture)));
    store.setConnection('connected');
    store.applyGameEvent(event('submission:scored', scoredFixture));
    store.applyGameEvent(event('round:finalized', finalizedFixture));
    expect(useRoomStore.getState().game?.screen).toBe('capture');
    const stored = JSON.stringify(useRoomStore.getState());
    expect(stored).not.toContain('test-media-token');
    expect(stored).not.toContain(String(scoredFixture.targetScore));
    expect(stored).not.toContain(String(finalizedFixture.results[0].rankPoints));
  });
  it('무효 라운드는 점수 없이 폐기하고 3회 연속이면 서버 중단 결과를 따른다', () => {
    const store = useRoomStore.getState();
    store.hydrate(toLobbySnapshot(roomStateSchema.parse(captureSnapshotFixture)));
    store.setConnection('connected');
    store.beginUpload('87');
    store.applyGameEvent(event('round:voided', { roundId: '87', index: 3, reason: 'engine_unavailable', nextRoundAtMs: 1757203365000 }));
    expect(useRoomStore.getState().game).toEqual({ screen: 'waiting', roundId: '87', index: 3, reason: 'voided', nextRoundAtMs: 1757203365000 });
    // The voided round keeps no score, media or capture token, and the used token stays spent.
    expect(JSON.stringify(useRoomStore.getState())).not.toContain('test-capture-token');
    expect(useRoomStore.getState().uploadRoundId).toBeNull();
    store.applyGameEvent(event('submission:scored', scoredFixture));
    store.applyGameEvent(event('round:revealed', { ...revealedFixture, roundId: '88', index: 4 }));
    expect(useRoomStore.getState().game).toMatchObject({ screen: 'countdown', roundId: '88' });
    store.applyGameEvent(event('round:voided', { roundId: '88', index: 4, reason: 'engine_unavailable', nextRoundAtMs: 1757203385000 }));
    store.applyGameEvent(event('game:finished', { ...finishedFixture, aborted: true, reason: 'engine_unavailable' }));
    expect(useRoomStore.getState().game).toEqual({ screen: 'final', ...finishedFixture, aborted: true, reason: 'engine_unavailable' });
  });
  it('미제출자도 무효 라운드 안내를 받는다', () => {
    let game = restoreGame(gameSnapshotSchema.parse({ screen: 'round_missed', currentRound: { roundId: '87', index: 3, phase: 'scoring' } }), 5);
    game = reduceGame(game, event('round:voided', { roundId: '87', index: 3, reason: 'engine_unavailable', nextRoundAtMs: 1757203365000 }));
    expect(game).toEqual({ screen: 'waiting', roundId: '87', index: 3, reason: 'voided', nextRoundAtMs: 1757203365000 });
  });
  it('결과와 최종 snapshot 복원은 서버 순위·포인트를 그대로 사용한다', () => {
    const result = restoreGame(gameSnapshotSchema.parse(resultSnapshotFixture.game), 5);
    expect(result).toMatchObject({ screen: 'result', cards: [scoredFixture], results: finalizedFixture.results });
    expect(restoreGame(gameSnapshotSchema.parse({ screen: 'final', ...finishedFixture }), 5)).toEqual({ screen: 'final', ...finishedFixture });
  });
  it('촬영 토큰 누락·잘못된 화면·불완전한 결과 snapshot을 거절한다', () => {
    expect(gameSnapshotSchema.safeParse({ ...captureSnapshotFixture.game, currentRound: { ...captureSnapshotFixture.game.currentRound, captureToken: undefined } }).success).toBe(false);
    expect(gameSnapshotSchema.safeParse({ screen: 'unknown' }).success).toBe(false);
    expect(gameSnapshotSchema.safeParse({ screen: 'result', currentRound: resultSnapshotFixture.game.currentRound }).success).toBe(false);
  });
  it('마감 이벤트 뒤의 늦은 202는 미제출을 결과 화면으로 되돌리지 않는다', () => {
    const store = useRoomStore.getState();
    store.hydrate(toLobbySnapshot(roomStateSchema.parse(captureSnapshotFixture)));
    store.setConnection('connected');
    store.beginUpload('87');
    store.applyGameEvent(event('round:missed', { roundId: '87', index: 3, roundCount: 5, phase: 'scoring' }));
    store.acceptUpload('87');
    expect(useRoomStore.getState().game?.screen).toBe('round_missed');
  });
  it('동일 라운드 snapshot이 미제출이어도 사용한 토큰을 다시 전송하지 않는다', () => {
    const store = useRoomStore.getState();
    const snapshot = toLobbySnapshot(roomStateSchema.parse(captureSnapshotFixture));
    store.hydrate(snapshot); store.setConnection('connected');
    store.beginUpload('87'); store.hydrate(snapshot);
    expect(store.beginUpload('87')).toBe(false);
    store.close('host_closed');
    expect(JSON.stringify(useRoomStore.getState())).not.toContain('test-capture-token');
  });
});
