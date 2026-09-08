import { StickerButton } from './StickerButton';

type CaptureReviewProps = {
  imageUrl: string;
  submitting: boolean;
  locked?: boolean;
  error?: string | null;
  onRetake: () => void;
  onSubmit: () => void;
};

export function CaptureReview({ imageUrl, submitting, locked = false, error, onRetake, onSubmit }: CaptureReviewProps) {
  return (
    <div className="capture-review">
      <img src={imageUrl} alt="방금 촬영한 사진" />
      <p>이 사진으로 제출할까요?</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="capture-review__actions">
        <StickerButton tone="plain" disabled={submitting || locked} onClick={onRetake}>다시 찍기</StickerButton>
        <StickerButton disabled={submitting || locked} onClick={onSubmit}>{submitting ? '제출 확인 중' : '제출하기'}</StickerButton>
      </div>
    </div>
  );
}
