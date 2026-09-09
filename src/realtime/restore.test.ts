import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { getRoomState, roomStateSchema, toLobbySnapshot } from '../api/roomEntry';
import { captureSnapshotFixture, resultSnapshotFixture } from '../tests/fixtures/game';
import { useRoomStore } from '../stores/roomStore';
import { createRoomRestorer } from './restore';
vi.mock('../api/roomEntry', async (original) => ({ ...await original<typeof import('../api/roomEntry')>(), getRoomState: vi.fn() }));
const capture = () => toLobbySnapshot(roomStateSchema.parse(captureSnapshotFixture));
const result = () => toLobbySnapshot(roomStateSchema.parse(resultSnapshotFixture));
const restorers: ReturnType<typeof createRoomRestorer>[] = [];
function restorer() {
  const instance = createRoomRestorer(captureSnapshotFixture.room.slug);
  restorers.push(instance); return instance;
}
beforeEach(() => useRoomStore.getState().hydrate(capture()));
afterEach(() => { restorers.splice(0).forEach((item) => item.dispose()); useRoomStore.getState().clear(); vi.resetAllMocks(); vi.useRealTimers(); });
describe('atomic room restore', () => {
  it('중복 요청을 합치고 완성된 snapshot을 한 번에 반영한다', async () => {
    let resolve!: (value: ReturnType<typeof capture>) => void;
    vi.mocked(getRoomState).mockReturnValue(new Promise((done) => { resolve = done; }));
    const instance = restorer();
    const first = instance.restore(); const second = instance.restore();
    expect(first).toBe(second);
    expect(useRoomStore.getState().restoring).toBe(true);
    expect(useRoomStore.getState().game?.screen).toBe('capture');
    resolve(result());
    expect(await first).toBe(true);
    expect(useRoomStore.getState().game?.screen).toBe('result');
    expect(useRoomStore.getState().restoring).toBe(false);
    expect(getRoomState).toHaveBeenCalledTimes(1);
  });
  it('요청 중 이벤트가 도착하면 이전 응답을 버리고 다시 조회한다', async () => {
    let resolve!: (value: ReturnType<typeof capture>) => void;
    vi.mocked(getRoomState).mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValueOnce(result());
    const instance = restorer(); const pending = instance.restore();
    instance.changed(); resolve(capture());
    expect(await pending).toBe(true);
    expect(getRoomState).toHaveBeenCalledTimes(2);
    expect(useRoomStore.getState().game?.screen).toBe('result');
  });
  it('연결 해제 후 이전 요청의 응답이 상태를 덮어쓰지 않는다', async () => {
    let resolve!: (value: ReturnType<typeof capture>) => void;
    vi.mocked(getRoomState).mockReturnValue(new Promise((done) => { resolve = done; }));
    const instance = restorer(); const pending = instance.restore();
    instance.suspend();
    useRoomStore.getState().close('host_closed'); resolve(result());
    expect(await pending).toBe(false);
    expect(useRoomStore.getState().game).toBeNull();
  });
  it('게임 중 /state 미지원 응답은 진행 화면을 유지하고 경고를 남기지 않는다', async () => {
    // The server answers 503 outside the lobby by design, so live events stay authoritative.
    vi.mocked(getRoomState).mockRejectedValue(new ApiError('SERVICE_UNAVAILABLE', '아직 요청을 처리할 준비가 되지 않았어요', 503));
    const instance = restorer();

    expect(await instance.restore()).toBe(false);
    expect(useRoomStore.getState().restoreError).toBeNull();
    expect(useRoomStore.getState().restoring).toBe(false);
    expect(useRoomStore.getState().game?.screen).toBe('capture');

    expect(await instance.restore(true)).toBe(false);
    expect(useRoomStore.getState().restoreWarning).toBeNull();
  });
  it('잘못된 응답은 재시도 오류로 표시한다', async () => {
    vi.mocked(getRoomState).mockRejectedValue(new Error('SERVICE_UNAVAILABLE'));
    expect(await restorer().restore()).toBe(false);
    expect(useRoomStore.getState().restoring).toBe(false);
    expect(useRoomStore.getState().restoreError).toBeTruthy();
  });
  it('시간 초과로 요청을 중단하고 무한 복원 화면을 남기지 않는다', async () => {
    vi.useFakeTimers();
    vi.mocked(getRoomState).mockImplementation((_slug, signal) => new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    const pending = restorer().restore();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toBe(false);
    expect(useRoomStore.getState().restoring).toBe(false);
    expect(useRoomStore.getState().restoreError).toBeTruthy();
  });
});


it('접수 후 backlog 조회 실패는 도착한 결과를 지우지 않고 경고로 표시한다', async () => {
  useRoomStore.getState().hydrate(result());
  vi.mocked(getRoomState).mockRejectedValue(new Error('unsupported'));
  expect(await restorer().restore(true)).toBe(false);
  expect(useRoomStore.getState().restoreError).toBeNull();
  expect(useRoomStore.getState().restoreWarning).toBeTruthy();
  expect(useRoomStore.getState().game?.screen).toBe('result');
});
