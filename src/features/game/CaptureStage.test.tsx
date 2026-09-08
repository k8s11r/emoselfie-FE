import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/errors';
import { CaptureStage } from './CaptureStage';
import { SubmissionFailure } from './submissionOutcome';

const stop = vi.fn();
vi.mock('../../camera/useCameraPreview', () => ({
  useCameraPreview: () => ({ phase: 'live', slow: false, failure: null, retry: vi.fn(), stop }),
}));
vi.mock('../../camera/frame', () => ({
  CaptureError: class CaptureError extends Error {},
  captureVideoFrame: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })),
}));

const props = {
  emotion: { displayName: '놀람', emoji: '😲', hint: '뒤에서 누가 부른 것처럼' },
  round: 3, totalRounds: 5, submittedCount: 1, participantCount: 5,
  submissionEndsAtMs: 9_000,
};

beforeEach(() => vi.stubGlobal('URL', { createObjectURL: () => 'blob:preview', revokeObjectURL: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function shoot(onSubmit: (blob: Blob) => Promise<void>) {
  const user = userEvent.setup();
  render(<CaptureStage {...props} onSubmit={onSubmit} />);
  await user.click(screen.getByRole('button', { name: '사진 촬영' }));
  await user.click(await screen.findByRole('button', { name: '제출하기' }));
  return user;
}

describe('CaptureStage 제출 오류 분기', () => {
  it('요청 전에 걸러진 사진은 다시 찍기를 열어 둔다', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new SubmissionFailure('UNSUPPORTED_MEDIA', 'JPEG 사진만 제출할 수 있어요. 다시 찍어 주세요.', 'retake'));
    const user = await shoot(onSubmit);

    expect(await screen.findByRole('alert')).toHaveTextContent('다시 찍어 주세요');
    const retake = screen.getByRole('button', { name: '다시 찍기' });
    expect(retake).toBeEnabled();
    await user.click(retake);
    expect(screen.getByRole('button', { name: '사진 촬영' })).toBeEnabled();
  });

  it('서버가 사진을 읽지 못하면 같은 사진의 재전송을 막는다', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('UNSUPPORTED_MEDIA', '', 415));
    const user = await shoot(onSubmit);

    expect(await screen.findByRole('alert')).toHaveTextContent('사진을 읽지 못했어요');
    // The server answered, so the one-use capture token is spent: no resend.
    expect(screen.getByRole('button', { name: '제출하기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다시 찍기' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '제출하기' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('마감 지난 제출은 안내만 남기고 같은 사진을 다시 보내지 않는다', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('DEADLINE_PASSED', '', 410));
    await shoot(onSubmit);

    expect(await screen.findByRole('alert')).toHaveTextContent('제출 시간이 끝났어요');
    expect(screen.getByRole('button', { name: '제출하기' })).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });

  it('제출이 인정되면 카메라를 정리한다', async () => {
    await shoot(vi.fn().mockResolvedValue(undefined));

    expect(stop).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
