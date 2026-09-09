import { afterEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { connectRoomSocket } from './socket';
import { useRoomStore } from '../stores/roomStore';
import { getRoomState, roomJoinedSchema, toLobbySnapshot } from '../api/roomEntry';
import { roomJoinedFixture } from '../tests/fixtures/room';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('../api/roomEntry', async (original) => ({ ...await original<typeof import('../api/roomEntry')>(), getRoomState: vi.fn() }));
function fakeSocket() {
  const handlers = new Map<string, (payload?: unknown) => void>();
  return {
    on: vi.fn((event: string, handler: (payload?: unknown) => void) => handlers.set(event, handler)),
    connect: vi.fn(), disconnect: vi.fn(), emit: vi.fn(),
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
  vi.mocked(getRoomState).mockReset();
  vi.useRealTimers();
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
    expect(useRoomStore.getState().connection).toBe('connecting');
    second.fake.receive('room:joined', roomJoinedFixture);
    expect(useRoomStore.getState().connection).toBe('connected');
    second.release();
    second.fake.receive('room:joined', roomJoinedFixture);
    expect(useRoomStore.getState().snapshot?.room.slug).toBe(roomJoinedFixture.room.slug);
  });
});


describe('room lifecycle events', () => {
  it('임시 방장과 복귀를 반영하고 잘못된 ID를 무시한다', () => {
    const { fake } = connect();
    fake.receive('room:joined', roomJoinedFixture);
    fake.receive('host:changed', { hostParticipantId: '42', temporary: true });
    expect(useRoomStore.getState().temporaryHost).toBe(true);
    expect(useRoomStore.getState().snapshot?.me.isHost).toBe(false);
    fake.receive('host:changed', { hostParticipantId: {}, temporary: false });
    expect(useRoomStore.getState().temporaryHost).toBe(true);
    fake.receive('host:changed', { hostParticipantId: '41', temporary: false });
    expect(useRoomStore.getState().temporaryHost).toBe(false);
    expect(useRoomStore.getState().snapshot?.me.isHost).toBe(true);
    expect(useRoomStore.getState().snapshot?.participants[0].isHost).toBe(true);
  });

  it('설정 이벤트에서 생략된 emotionSet을 유지한다', () => {
    const { fake } = connect();
    fake.receive('room:joined', roomJoinedFixture);
    fake.receive('room:settingsUpdated', { settings: { roundCount: 7, timeLimitSec: 30 } });
    expect(useRoomStore.getState().snapshot?.room.settings).toEqual({ roundCount: 7, timeLimitSec: 30, emotionSet: 'full' });
  });

  it.each(['host_closed', 'expired'])('방 종료 %s 뒤에는 데이터나 연결을 되살리지 않는다', (reason) => {
    const { fake } = connect();
    fake.receive('room:joined', roomJoinedFixture);
    fake.receive('room:closed', { reason: 'invalid' });
    expect(fake.disconnect).not.toHaveBeenCalled();
    fake.receive('room:closed', { reason });
    expect(fake.disconnect).toHaveBeenCalledOnce();
    expect(useRoomStore.getState().closedReason).toBe(reason);
    expect(useRoomStore.getState().snapshot).toBeNull();
    fake.receive('disconnect');
    fake.receive('room:joined', roomJoinedFixture);
    useRoomStore.getState().hydrate(toLobbySnapshot(roomJoinedSchema.parse(roomJoinedFixture)));
    expect(useRoomStore.getState().snapshot).toBeNull();
    expect(useRoomStore.getState().connection).toBe('idle');
  });
});

describe('presence lifecycle', () => {
  it('가입 후 25초마다 한 번 전송하며 재가입과 연결 해제 때 타이머를 정리한다', () => {
    vi.useFakeTimers();
    const { fake, release } = connect();
    fake.receive('connect');
    vi.advanceTimersByTime(25_000);
    expect(fake.emit).not.toHaveBeenCalled();
    fake.receive('room:joined', roomJoinedFixture);
    fake.receive('room:joined', roomJoinedFixture);
    vi.advanceTimersByTime(25_000);
    expect(fake.emit).toHaveBeenCalledTimes(1);
    expect(fake.emit.mock.calls[0].slice(0, 2)).toEqual(['presence:ping', {}]);
    fake.emit.mock.calls[0][2]({ ok: true });
    vi.advanceTimersByTime(25_000);
    expect(fake.emit).toHaveBeenCalledTimes(2);
    fake.receive('disconnect');
    fake.emit.mock.calls[1][2]({ ok: true });
    expect(useRoomStore.getState().connection).toBe('reconnecting');
    vi.advanceTimersByTime(60_000);
    expect(fake.emit).toHaveBeenCalledTimes(2);
    release();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ACK 오류·시간 초과를 표시하고 이전 ACK로 연결 상태를 덮어쓰지 않는다', () => {
    vi.useFakeTimers();
    const { fake } = connect();
    fake.receive('room:joined', roomJoinedFixture);
    vi.advanceTimersByTime(25_000);
    fake.emit.mock.calls[0][2]({ ok: false, error: { code: 'UNAVAILABLE', message: 'retry' } });
    expect(useRoomStore.getState().connection).toBe('offline');
    vi.advanceTimersByTime(25_000);
    vi.advanceTimersByTime(10_000);
    fake.emit.mock.calls[1][2]({ ok: true });
    expect(useRoomStore.getState().connection).toBe('offline');
    vi.advanceTimersByTime(15_000);
    fake.emit.mock.calls[2][2]({ ok: true });
    expect(useRoomStore.getState().connection).toBe('connected');
  });

  it.each(['session:superseded', 'room:closed'])('%s 뒤에는 ping과 늦은 ACK를 차단한다', (event) => {
    vi.useFakeTimers();
    const { fake } = connect();
    fake.receive('room:joined', roomJoinedFixture);
    vi.advanceTimersByTime(25_000);
    fake.receive(event, { reason: 'host_closed' });
    fake.emit.mock.calls[0][2]({ ok: true });
    fake.receive('disconnect');
    vi.advanceTimersByTime(60_000);
    expect(fake.emit).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(useRoomStore.getState().connection).toBe(event === 'room:closed' ? 'idle' : 'superseded');
  });
});


it('room:joined가 connect보다 먼저 와도 가입 상태와 presence 타이머를 유지한다', () => {
  vi.useFakeTimers();
  const { fake } = connect();
  fake.receive('room:joined', roomJoinedFixture);
  fake.receive('connect');
  expect(useRoomStore.getState().connection).toBe('connected');
  vi.advanceTimersByTime(25_000);
  expect(fake.emit).toHaveBeenCalledTimes(1);
});
it('재연결·foreground 복귀에 state를 조회하고 해제 후에는 조회하지 않는다', async () => {
  vi.mocked(getRoomState).mockResolvedValue(toLobbySnapshot(roomJoinedSchema.parse(roomJoinedFixture)));
  const { fake, release } = connect();
  fake.receive('room:joined', roomJoinedFixture);
  fake.receive('disconnect'); fake.receive('connect'); fake.receive('room:joined', roomJoinedFixture);
  await vi.waitFor(() => expect(useRoomStore.getState().restoring).toBe(false));
  expect(getRoomState).toHaveBeenCalledTimes(1);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(() => expect(getRoomState).toHaveBeenCalledTimes(2));
  release();
  document.dispatchEvent(new Event('visibilitychange'));
  expect(getRoomState).toHaveBeenCalledTimes(2);
});
