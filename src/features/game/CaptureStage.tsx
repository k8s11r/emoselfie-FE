import { useEffect, useRef, useState } from 'react';
import { captureVideoFrame, CaptureError } from '../../camera/frame';
import { createPhotoResource, releasePhotoResource, type PhotoResource } from '../../camera/photoResource';
import { useCameraPreview } from '../../camera/useCameraPreview';
import { CameraPreview } from '../../components/CameraPreview';
import { CaptureReview } from '../../components/CaptureReview';
import { ServerTimer } from '../../components/ServerTimer';
import { SubmissionCounter } from '../../components/SubmissionCounter';
import { describeUploadError } from './submissionOutcome';

type CaptureStageProps = {
  emotion: { displayName: string; emoji: string; hint: string };
  round: number;
  totalRounds: number;
  submittedCount: number;
  participantCount: number;
  submissionEndsAtMs: number;
  locked?: boolean;
  onSubmit: (blob: Blob) => Promise<void>;
};

export function CaptureStage({
  emotion,
  round,
  totalRounds,
  submittedCount,
  participantCount,
  submissionEndsAtMs,
  locked = false,
  onSubmit,
}: CaptureStageProps) {
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCameraPreview(videoRef);
  const [photo, setPhoto] = useState<PhotoResource | null>(null);
  const [status, setStatus] = useState<'idle' | 'encoding' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  // A server response consumed the one-use capture token, so the same photo
  // must not be offered for resending even though it is still on screen.
  const [spent, setSpent] = useState(false);

  useEffect(() => () => {
    releasePhotoResource(photo);
  }, [photo]);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || camera.phase !== 'live' || locked || status !== 'idle') return;
    setStatus('encoding');
    setError(null);
    try {
      const blob = await captureVideoFrame(video);
      if (active.current) setPhoto(createPhotoResource(blob));
    } catch (value) {
      setError(value instanceof CaptureError ? value.message : '사진을 찍지 못했어요. 다시 시도해 주세요.');
    } finally {
      setStatus('idle');
    }
  }

  function retake() {
    if (spent) return;
    setPhoto(null);
    setError(null);
  }

  async function submit() {
    if (!photo || status !== 'idle' || locked || spent) return;
    setStatus('uploading');
    setError(null);
    try {
      await onSubmit(photo.blob);
      if (active.current) camera.stop();
    } catch (value) {
      const failure = describeUploadError(value);
      if (!active.current) return;
      setError(failure.message);
      if (failure.recovery !== 'retake') setSpent(true);
    } finally {
      if (active.current) setStatus('idle');
    }
  }

  return (
    <main className="capture-stage">
      <header className="capture-stage__header">
        <SubmissionCounter submitted={submittedCount} total={participantCount} />
        <span className="round-label">{round} / {totalRounds} 라운드</span>
        <ServerTimer endsAtMs={submissionEndsAtMs} label="촬영 마감까지" />
      </header>

      <section className="emotion-prompt" aria-labelledby="capture-emotion">
        <span aria-hidden="true">{emotion.emoji}</span>
        <div><h1 id="capture-emotion">{emotion.displayName}</h1><p>{emotion.hint}</p></div>
      </section>

      <div className="capture-frame">
        <CameraPreview videoRef={videoRef} phase={camera.phase} slow={camera.slow} failure={camera.failure} hidden={Boolean(photo)} onRetry={camera.retry} />
        {photo ? <CaptureReview imageUrl={photo.url} locked={locked || spent} submitting={status === 'uploading'} error={error} onRetake={retake} onSubmit={submit} /> : null}
      </div>

      {!photo ? (
        <div className="shutter-area">
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="shutter-button" type="button" aria-label="사진 촬영" disabled={camera.phase !== 'live' || status !== 'idle' || locked} onClick={takePhoto}><span /></button>
          <p>{locked ? '촬영 시간이 끝났어요. 서버 상태를 확인하고 있어요.' : '사진은 영구 저장하지 않아요.'}</p>
        </div>
      ) : null}
    </main>
  );
}
