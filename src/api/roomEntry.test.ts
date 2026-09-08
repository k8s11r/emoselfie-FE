import { describe, expect, it } from 'vitest';
import { roomJoinedFixture } from '../tests/fixtures/room';
import { roomJoinedSchema, roomStateSchema, toLobbySnapshot } from './roomEntry';

describe('room wire contracts', () => {
  it('room:joined는 닉네임·서버 시각 없이 수신하고 참여자 목록에서 본인 닉네임을 복원한다', () => {
    const snapshot = toLobbySnapshot(roomJoinedSchema.parse(roomJoinedFixture));
    expect(snapshot.me.nickname).toBe('지수');
    expect(snapshot.game).toBeNull();
    expect(snapshot.serverTimeMs).toBeUndefined();
  });
  it('HTTP snapshot은 서버 시각이 필수이고 응답의 본인 닉네임을 우선한다', () => {
    expect(roomStateSchema.safeParse(roomJoinedFixture).success).toBe(false);
    const snapshot = toLobbySnapshot(roomStateSchema.parse({
      ...roomJoinedFixture, me: { ...roomJoinedFixture.me, nickname: '수정된이름' }, serverTimeMs: 1757203352410,
    }));
    expect(snapshot.me.nickname).toBe('수정된이름');
    expect(snapshot.serverTimeMs).toBe(1757203352410);
  });
  it('잘못된 ID·색상·시각 타입을 거부한다', () => {
    expect(roomJoinedSchema.safeParse({ ...roomJoinedFixture, me: { ...roomJoinedFixture.me, participantId: 41 } }).success).toBe(false);
    expect(roomJoinedSchema.safeParse({ ...roomJoinedFixture, participants: [{ ...roomJoinedFixture.participants[0], colorTag: 12 }] }).success).toBe(false);
    expect(roomStateSchema.safeParse({ ...roomJoinedFixture, serverTimeMs: '1757203352410' }).success).toBe(false);
  });
});
