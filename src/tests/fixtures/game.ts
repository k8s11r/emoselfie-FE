import { roomJoinedFixture } from './room';
export const emotionFixture = { label: 'surprise', displayName: '놀람', emoji: '😲', color: '#8F66FF', hint: '뒤에서 누가 부른 것처럼' };
export const revealedFixture = { roundId: '87', index: 3, roundCount: 5, emotion: emotionFixture, countdownEndsAtMs: 1757203340000, deadlineAtMs: 1757203360000, captureToken: 'test-capture-token', activeCount: 5 };
export const scoredFixture = { roundId: '87', submissionId: '913', participantId: '42', nickname: '태호', colorTag: 5, status: 'submitted' as const, targetScore: 84.2, topEmotions: [{ label: 'surprise', score: 84.2 }], currentRank: 2, mediaToken: 'test-media-token', scoredCount: 1, scoredTotal: 5 };
export const finalizedFixture = { roundId: '87', results: [{ participantId: '42', rank: 1, targetScore: 91.3, rankPoints: 100, totalPoints: 270, status: 'submitted' as const }], viewingEndsAtMs: 1757203380000 };
export const finishedFixture = { aborted: false, reason: null, ranking: [{ rank: 1, participantId: '42', nickname: '태호', colorTag: 5, totalPoints: 380, likeCount: 7, questionCount: 2 }], mostLoved: { participantId: '42', likeCount: 7 } };
export const captureSnapshotFixture = {
  ...roomJoinedFixture, room: { ...roomJoinedFixture.room, status: 'playing' }, serverTimeMs: 1757203352410,
  game: { screen: 'capture', currentRound: { ...revealedFixture, status: 'capturing', viewingEndsAtMs: null, mySubmission: { status: 'none' } } },
};
// Proposed result/final container fields: see GAME_CONTRACT.md. Event payloads above
// and capture snapshot fields are from the backend specification, not a live server.
export const resultSnapshotFixture = {
  ...captureSnapshotFixture,
  game: { screen: 'result', currentRound: { roundId: '87', index: 3, status: 'finalized', viewingEndsAtMs: finalizedFixture.viewingEndsAtMs, mySubmission: { status: 'submitted', submissionId: '913' } },
    scoredSubmissions: [scoredFixture], finalized: finalizedFixture, reactions: [], skipStatus: null },
};
