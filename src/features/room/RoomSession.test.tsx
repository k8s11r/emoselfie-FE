import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectRoomSocket } from '../../realtime/socket';
import { roomStateSchema, toLobbySnapshot } from '../../api/roomEntry';
import { parseGameEvent } from '../../api/game';
import { captureSnapshotFixture, finishedFixture, resultSnapshotFixture, revealedFixture } from '../../tests/fixtures/game';
import { roomJoinedFixture } from '../../tests/fixtures/room';
import { useRoomStore } from '../../stores/roomStore';
import { RoomSession } from './RoomSession';
import { syncServerClock } from '../../time/serverClock';
import { uploadSubmission } from '../../api/submissions';
import { ApiError } from '../../api/errors';
import { SubmissionFailure } from '../game/submissionOutcome';
vi.mock('../../realtime/socket', () => ({ connectRoomSocket: vi.fn(() => vi.fn()) }));
vi.mock('../../api/submissions', async (importOriginal) => ({ ...await importOriginal<typeof import('../../api/submissions')>(), uploadSubmission: vi.fn() }));
const submitFailures: string[] = [];
vi.mock('../game/CaptureStage', () => ({ CaptureStage: ({ onSubmit, locked }: { onSubmit: (image: Blob) => Promise<void>; locked: boolean }) => <button disabled={locked} onClick={() => { void onSubmit(new Blob(['jpeg'], { type: 'image/jpeg' })).catch((error: unknown) => submitFailures.push(error instanceof SubmissionFailure ? `${error.code}:${error.recovery}` : 'unknown')); }}>테스트 사진 제출</button> }));
const clients: QueryClient[] = [];
function show(snapshot: unknown) {
  useRoomStore.getState().hydrate(toLobbySnapshot(roomStateSchema.parse(snapshot)));
  useRoomStore.getState().setConnection('connected');
  const client = new QueryClient(); clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter><RoomSession slug={roomJoinedFixture.room.slug} /></MemoryRouter></QueryClientProvider>);
}
function receive(type: Parameters<typeof parseGameEvent>[0], payload: unknown) {
  const event = parseGameEvent(type, payload); if (!event) throw new Error('fixture');
  act(() => useRoomStore.getState().applyGameEvent(event));
}
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); useRoomStore.getState().clear(); submitFailures.length = 0; vi.clearAllMocks(); vi.useRealTimers(); });
function showCaptureBeforeDeadline() {
  const localNow = performance.now();
  syncServerClock(revealedFixture.deadlineAtMs - 5_000, localNow, localNow);
  return show(captureSnapshotFixture);
}
describe('room screen routing', () => {
  it('대기실부터 카운트다운·촬영·202·최종 결과까지 소켓을 유지한다', async () => {
    const localNow = performance.now(); syncServerClock(revealedFixture.countdownEndsAtMs + 1, localNow, localNow);
    vi.mocked(uploadSubmission).mockResolvedValue({ submissionId: '913', acceptedAtMs: revealedFixture.countdownEndsAtMs + 1, status: 'processing' });
    show({ ...roomJoinedFixture, serverTimeMs: 1 });
    expect(screen.getByRole('heading', { name: '5라운드 · 20초' })).toBeVisible();
    receive('game:started', { roundCount: 5, timeLimitSec: 20, participantIds: ['41', '42'] });
    expect(screen.getByRole('heading', { name: '게임을 시작해요' })).toBeVisible();
    receive('round:revealed', revealedFixture);
    await userEvent.setup().click(screen.getByRole('button', { name: '테스트 사진 제출' }));
    expect(await screen.findByRole('heading', { name: '3라운드 결과' })).toBeVisible();
    expect(uploadSubmission).toHaveBeenCalledTimes(1);
    receive('game:finished', finishedFixture);
    expect(screen.getByRole('heading', { name: '최종 결과' })).toBeVisible();
    expect(connectRoomSocket).toHaveBeenCalledTimes(1);
  });
  it('카운트다운이 끝나기 전에는 촬영을 시작하지 않는다', () => {
    const localNow = performance.now(); syncServerClock(revealedFixture.countdownEndsAtMs - 2_000, localNow, localNow);
    show({ ...captureSnapshotFixture, game: { ...captureSnapshotFixture.game, screen: 'countdown' } });
    expect(screen.getByRole('heading', { name: '😲 놀람' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '테스트 사진 제출' })).not.toBeInTheDocument();
  });
  it('결과 snapshot을 바로 복원하고 단절 중에는 사진을 숨긴다', () => {
    show(resultSnapshotFixture);
    expect(screen.getByRole('img', { name: '태호의 제출 사진' })).toBeVisible();
    act(() => useRoomStore.getState().setConnection('reconnecting'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '연결 상태' })).toBeVisible();
  });
  it('마감 후 도착한 제출은 재시도를 유도하지 않고 미제출로 안내한다', async () => {
    vi.mocked(uploadSubmission).mockRejectedValue(new ApiError('DEADLINE_PASSED', '제출 시간이 끝났어요', 410));
    showCaptureBeforeDeadline();
    await userEvent.setup().click(screen.getByRole('button', { name: '테스트 사진 제출' }));
    expect(await screen.findByRole('heading', { name: '이번 라운드를 놓쳤어요' })).toBeVisible();
    expect(uploadSubmission).toHaveBeenCalledTimes(1);
    expect(submitFailures).toEqual(['DEADLINE_PASSED:locked']);
  });
  it('서버가 이미 접수한 제출은 결과 대기로 유지하고 같은 토큰을 다시 보내지 않는다', async () => {
    vi.mocked(uploadSubmission).mockRejectedValue(new ApiError('ALREADY_SUBMITTED', '이미 제출했어요', 409));
    showCaptureBeforeDeadline();
    await userEvent.setup().click(screen.getByRole('button', { name: '테스트 사진 제출' }));
    expect(await screen.findByRole('heading', { name: '3라운드 결과' })).toBeVisible();
    expect(uploadSubmission).toHaveBeenCalledTimes(1);
    expect(submitFailures).toEqual(['ALREADY_SUBMITTED:locked']);
  });
  it('토큰 오류는 촬영 화면을 잠그고 현재 상태 확인만 남긴다', async () => {
    vi.mocked(uploadSubmission).mockRejectedValue(new ApiError('INVALID_CAPTURE_TOKEN', '다시 촬영해 주세요', 403));
    showCaptureBeforeDeadline();
    await userEvent.setup().click(screen.getByRole('button', { name: '테스트 사진 제출' }));
    expect(await screen.findByRole('button', { name: '현재 상태 확인' })).toBeVisible();
    expect(screen.getByRole('button', { name: '테스트 사진 제출' })).toBeDisabled();
    expect(uploadSubmission).toHaveBeenCalledTimes(1);
    expect(submitFailures).toEqual(['INVALID_CAPTURE_TOKEN:refresh']);
  });
  it('미제출 snapshot의 감정·결과·참여자 정보를 표시하지 않는다', () => {
    show({ ...captureSnapshotFixture, game: { screen: 'round_missed', currentRound: { roundId: '87', index: 3, phase: 'scoring', emotion: captureSnapshotFixture.game.currentRound.emotion } } });
    expect(screen.getByRole('heading', { name: '이번 라운드를 놓쳤어요' })).toBeVisible();
    expect(screen.queryByText('놀람')).not.toBeInTheDocument();
    expect(screen.queryByText('지수')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
