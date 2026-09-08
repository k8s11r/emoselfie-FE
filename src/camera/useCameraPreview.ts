import { useCallback, useEffect, useState, type RefObject } from 'react';
import { CameraAccessError, type CameraFailure } from './permission';
import { cameraService, CameraRequestCancelledError, type CameraService } from './CameraService';

export type CameraPreviewPhase = 'starting' | 'live' | 'interrupted' | 'error';

type CameraPreviewState = {
  phase: CameraPreviewPhase;
  slow: boolean;
  failure: CameraFailure | null;
};

function waitForFrame(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const check = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) finish(resolve);
    };
    const timeout = window.setTimeout(() => finish(() => reject(new Error('FRAME_TIMEOUT'))), timeoutMs);
    const interval = window.setInterval(check, 50);
    const finish = (done: () => void) => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      video.removeEventListener('loadeddata', check);
      video.removeEventListener('canplay', check);
      done();
    };
    video.addEventListener('loadeddata', check);
    video.addEventListener('canplay', check);
    check();
  });
}

export function useCameraPreview(
  videoRef: RefObject<HTMLVideoElement | null>,
  service: CameraService = cameraService,
) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CameraPreviewState>({ phase: 'starting', slow: false, failure: null });
  useEffect(() => {
    let active = true;
    const videoElement = videoRef.current;
    const slowTimer = window.setTimeout(() => {
      if (active) setState((current) => ({ ...current, slow: true }));
    }, 1500);
    const failureTimer = window.setTimeout(() => {
      if (!active) return;
      service.stop();
      setState({ phase: 'error', slow: false, failure: 'unavailable' });
    }, 3000);

    service.start().then(async (nextStream) => {
      if (!active) return;
      const video = videoElement;
      if (!video) throw new Error('VIDEO_UNAVAILABLE');
      video.srcObject = nextStream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      await waitForFrame(video, 3000);
      if (!active) return;

      const track = nextStream.getVideoTracks()[0];
      track?.addEventListener('mute', () => active && setState((current) => ({ ...current, phase: 'interrupted' })));
      track?.addEventListener('unmute', () => active && setState({ phase: 'live', slow: false, failure: null }));
      track?.addEventListener('ended', () => active && setState({ phase: 'error', slow: false, failure: 'unavailable' }));
      window.clearTimeout(failureTimer);
      setState({ phase: 'live', slow: false, failure: null });
    }).catch((error: unknown) => {
      if (!active || error instanceof CameraRequestCancelledError) return;
      setState({
        phase: 'error',
        slow: false,
        failure: error instanceof CameraAccessError ? error.reason : 'unavailable',
      });
    }).finally(() => window.clearTimeout(slowTimer));

    return () => {
      active = false;
      window.clearTimeout(slowTimer);
      window.clearTimeout(failureTimer);
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
      service.stop();
    };
  }, [attempt, service, videoRef]);

  const retry = useCallback(() => {
    service.stop();
    setState({ phase: 'starting', slow: false, failure: null });
    setAttempt((current) => current + 1);
  }, [service]);

  return { ...state, retry, stop: () => service.stop() };
}
