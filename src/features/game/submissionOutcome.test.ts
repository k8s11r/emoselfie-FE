import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { validateCaptureImage } from '../../api/submissions';
import { describeUploadError, SubmissionFailure } from './submissionOutcome';

describe('describeUploadError', () => {
  it('요청 전에 걸러진 사진만 다시 찍기를 안내한다', () => {
    const local = validateCaptureImage(new Blob(['png'], { type: 'image/png' }));
    expect(local).not.toBeNull();
    const failure = describeUploadError(local);
    expect(failure.code).toBe('UNSUPPORTED_MEDIA');
    expect(failure.recovery).toBe('retake');
    expect(failure.message).toContain('다시 찍어 주세요');
  });

  it.each([
    ['DEADLINE_PASSED', 410, 'locked', '미제출'],
    ['ALREADY_SUBMITTED', 409, 'locked', '이미 접수된'],
    ['NOT_CURRENT_ROUND', 409, 'locked', '지난 라운드'],
    ['INVALID_CAPTURE_TOKEN', 403, 'refresh', '촬영 정보'],
    ['PAYLOAD_TOO_LARGE', 413, 'refresh', '용량'],
    ['UNSUPPORTED_MEDIA', 415, 'refresh', '읽지 못했어요'],
  ])('서버 %s 응답은 다시 찍어 보내도록 안내하지 않는다', (code, status, recovery, copy) => {
    const failure = describeUploadError(new ApiError(code, '서버 메시지', status));
    expect(failure.recovery).toBe(recovery);
    expect(failure.recovery).not.toBe('retake');
    expect(failure.message).toContain(copy);
  });

  it('알 수 없는 오류와 네트워크 실패는 현재 상태 확인으로 안내한다', () => {
    expect(describeUploadError(new ApiError('SERVICE_UNAVAILABLE', '', 503)).recovery).toBe('refresh');
    expect(describeUploadError(new TypeError('network')).code).toBe('UPLOAD_FAILED');
    expect(describeUploadError(new TypeError('network')).message).toContain('현재 접수 상태');
  });

  it('이미 판정한 실패는 그대로 유지한다', () => {
    const failure = new SubmissionFailure('CAPTURE_LOCKED', '촬영 시간이 끝났어요.', 'locked');
    expect(describeUploadError(failure)).toBe(failure);
  });
});
