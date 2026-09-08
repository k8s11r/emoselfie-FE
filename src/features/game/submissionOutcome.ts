import { ApiError } from '../../api/errors';
import { LocalImageError } from '../../api/submissions';

// retake: the request never left the device, so the capture token is unused.
// locked: the server decided this round for us; there is nothing to resend.
// refresh: the token may already be consumed, so only re-read the server state.
export type SubmissionRecovery = 'retake' | 'locked' | 'refresh';

export class SubmissionFailure extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly recovery: SubmissionRecovery,
  ) {
    super(message);
    this.name = 'SubmissionFailure';
  }
}

const CHECK_STATE = '현재 접수 상태를 확인한 뒤 안내를 따라 주세요.';

// BE spec §16 upload error table. A server response means the round's capture
// token was already consumed, so no branch resends the same photo (CP-05·10).
export function describeUploadError(error: unknown): SubmissionFailure {
  if (error instanceof SubmissionFailure) return error;
  if (error instanceof LocalImageError) {
    return new SubmissionFailure(error.code, `${error.message} 다시 찍어 주세요.`, 'retake');
  }

  if (error instanceof ApiError) {
    switch (error.code) {
      case 'DEADLINE_PASSED':
        return new SubmissionFailure(error.code, '제출 시간이 끝났어요. 이번 라운드는 미제출로 안내할게요.', 'locked');
      case 'ALREADY_SUBMITTED':
        return new SubmissionFailure(error.code, '이미 접수된 사진이 있어요. 서버가 인정한 사진으로 진행할게요.', 'locked');
      case 'NOT_CURRENT_ROUND':
        return new SubmissionFailure(error.code, '지난 라운드의 사진이에요. 현재 라운드 상태를 다시 확인할게요.', 'locked');
      case 'INVALID_CAPTURE_TOKEN':
        return new SubmissionFailure(error.code, `촬영 정보가 만료됐어요. ${CHECK_STATE}`, 'refresh');
      case 'PAYLOAD_TOO_LARGE':
        return new SubmissionFailure(error.code, `사진 용량이 너무 커요. ${CHECK_STATE}`, 'refresh');
      case 'UNSUPPORTED_MEDIA':
        return new SubmissionFailure(error.code, `사진을 읽지 못했어요. ${CHECK_STATE}`, 'refresh');
      default:
        return new SubmissionFailure(error.code, `제출을 확인하지 못했어요. ${CHECK_STATE}`, 'refresh');
    }
  }

  return new SubmissionFailure('UPLOAD_FAILED', `제출을 확인하지 못했어요. ${CHECK_STATE}`, 'refresh');
}
