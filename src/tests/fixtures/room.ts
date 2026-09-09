// Backend spec §13.2 room:joined example. Intentionally no me.nickname or clock.
export const roomJoinedFixture = {
  room: {
    slug: 'Xk9mQ2vB7nLp', status: 'waiting',
    settings: { roundCount: 5, timeLimitSec: 20, emotionSet: 'full' },
  },
  me: { participantId: '41', isHost: true, status: 'active', totalPoints: 0 },
  participants: [{
    participantId: '41', nickname: '지수', colorTag: 3,
    connectionStatus: 'connected', status: 'active', isHost: true,
  }],
  game: null,
};
