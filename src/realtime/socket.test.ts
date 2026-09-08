import { afterEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { connectRoomSocket } from './socket';
import { useRoomStore } from '../stores/roomStore';
import { roomJoinedFixture } from '../tests/fixtures/room';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
function fakeSocket() {
  const handlers = new Map<string, (payload?: unknown) => void>();
  return {
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => handlers.set(event, handler)),
    connect: vi.fn(), disconnect: vi.fn(),
    removeAllListeners: vi.fn(() => handlers.clear()),
    receive: (event: string, payload?: unknown) => handlers.get(event)?.(payload),
  };
}
const releases: (() => void)[] = [];
function connect(slug = roomJoinedFixture.room.slug) {
  const fake = fakeSocket();
  vi.mocked(io).mockReturnValueOnce(fake as unknown as ReturnType<typeof io>);
  const release = connectRoomSocket(slug);
  releases.push(release);
  return { fake, release };
}
afterEach(() => {
  releases.splice(0).forEach((release) => release());
  useRoomStore.getState().clear();
  vi.restoreAllMocks();
});

describe('room socket ownership', () => {
  it('명세의 room:joined를 반영하고 잘못된 payload와 다른 방 데이터는 무시한다', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fake } = connect();
    fake.receive('room:joined', roomJoinedFixture);
    const snapshot = useRoomStore.getState().snapshot;
    expect(snapshot?.me.nickname).toBe('지수');
    fake.receive('room:joined', { room: {} });
    expect(useRoomStore.getState().snapshot).toBe(snapshot);
    fake.receive('room:joined', { ...roomJoinedFixture, room: { ...roomJoinedFixture.room, slug: 'another-room' } });
    expect(useRoomStore.getState().snapshot).toBe(snapshot);
  });
  it('소켓 교체 시 이전 handler를 제거하고 늦은 정리가 새 연결을 해제하지 않는다', () => {
    const first = connect();
    const second = connect();
    expect(first.fake.removeAllListeners).toHaveBeenCalled();
    first.fake.receive('connect_error');
    expect(useRoomStore.getState().connection).toBe('connecting');
    first.release();
    expect(second.fake.disconnect).not.toHaveBeenCalled();
    second.fake.receive('connect');
    expect(useRoomStore.getState().connection).toBe('connected');
    second.release();
    second.fake.receive('room:joined', roomJoinedFixture);
    expect(useRoomStore.getState().snapshot).toBeNull();
  });
});
