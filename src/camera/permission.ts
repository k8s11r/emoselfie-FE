export type CameraFailure = 'denied' | 'no_device' | 'unavailable' | 'unsupported' | 'unknown';

export class CameraAccessError extends Error {
  constructor(public readonly reason: CameraFailure, message: string) {
    super(message);
    this.name = 'CameraAccessError';
  }
}

export function normalizeCameraError(error: unknown): CameraAccessError {
  if (!(error instanceof DOMException)) {
    return new CameraAccessError('unknown', '카메라를 켜지 못했어요. 다시 시도해 주세요.');
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new CameraAccessError('denied', '브라우저 설정에서 카메라를 허용해 주세요.');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraAccessError('no_device', '사용할 수 있는 카메라를 찾지 못했어요.');
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new CameraAccessError('unavailable', '카메라를 사용할 수 없어요. 다른 앱을 닫고 다시 시도해 주세요.');
    default:
      return new CameraAccessError('unknown', '카메라를 켜지 못했어요. 다시 시도해 주세요.');
  }
}

export async function verifyCameraAccess(mediaDevices: MediaDevices | undefined = navigator.mediaDevices): Promise<void> {
  if (!mediaDevices?.getUserMedia) {
    throw new CameraAccessError('unsupported', '이 브라우저에서는 카메라를 사용할 수 없어요.');
  }

  let stream: MediaStream | null = null;
  try {
    stream = await mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'user' } },
    });
  } catch (error) {
    throw normalizeCameraError(error);
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

