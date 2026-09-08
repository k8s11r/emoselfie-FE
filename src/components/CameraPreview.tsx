import type { RefObject } from 'react';
import type { CameraFailure } from '../camera/permission';
import type { CameraPreviewPhase } from '../camera/useCameraPreview';
import { StickerButton } from './StickerButton';

type CameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  phase: CameraPreviewPhase;
  slow: boolean;
  failure: CameraFailure | null;
  hidden?: boolean;
  onRetry: () => void;
};

const failureCopy: Record<CameraFailure, string> = {
  denied: '카메라 권한을 다시 확인해 주세요.',
  no_device: '사용할 수 있는 카메라를 찾지 못했어요.',
  unavailable: '카메라 프리뷰가 멈췄어요.',
  unsupported: '이 브라우저에서는 카메라를 사용할 수 없어요.',
  unknown: '카메라를 준비하지 못했어요.',
};

export function CameraPreview({ videoRef, phase, slow, failure, hidden = false, onRetry }: CameraPreviewProps) {
  return (
    <div className={`camera-preview${hidden ? ' camera-preview--hidden' : ''}`}>
      <video ref={videoRef} autoPlay muted playsInline aria-label="내 카메라 미리보기" />
      {phase !== 'live' ? (
        <div className="camera-preview__status" role="status" aria-live="polite">
          {phase === 'error' ? (
            <>
              <span aria-hidden="true">📹</span>
              <strong>{failure ? failureCopy[failure] : '카메라를 준비하지 못했어요.'}</strong>
              <StickerButton tone="yellow" onClick={onRetry}>카메라 다시 켜기</StickerButton>
            </>
          ) : phase === 'interrupted' ? (
            <><span aria-hidden="true">⏸️</span><strong>카메라 연결을 확인하고 있어요</strong></>
          ) : (
            <><span className="camera-spinner" aria-hidden="true" /><strong>{slow ? '카메라 준비가 평소보다 오래 걸리고 있어요' : '카메라를 준비하고 있어요'}</strong></>
          )}
        </div>
      ) : null}
    </div>
  );
}
