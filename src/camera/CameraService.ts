import { CameraAccessError, normalizeCameraError } from './permission';

export class CameraRequestCancelledError extends Error {
  constructor() {
    super('더 이상 필요하지 않은 카메라 요청이에요.');
    this.name = 'CameraRequestCancelledError';
  }
}

type MediaDevicesProvider = () => MediaDevices | undefined;

export class CameraService {
  private generation = 0;
  private stream: MediaStream | null = null;
  private pending: Promise<MediaStream> | null = null;

  constructor(private readonly getMediaDevices: MediaDevicesProvider = () => navigator.mediaDevices) {}

  async start(): Promise<MediaStream> {
    if (this.stream?.getVideoTracks().some((track) => track.readyState === 'live')) return this.stream;
    if (this.pending) return this.pending;

    const requestGeneration = ++this.generation;
    const mediaDevices = this.getMediaDevices();
    if (!mediaDevices?.getUserMedia) {
      throw new CameraAccessError('unsupported', '이 브라우저에서는 카메라를 사용할 수 없어요.');
    }

    const request = mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'user' } },
    }).then((stream) => {
      if (requestGeneration !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        throw new CameraRequestCancelledError();
      }
      this.stream = stream;
      return stream;
    }).catch((error: unknown) => {
      if (error instanceof CameraRequestCancelledError || error instanceof CameraAccessError) throw error;
      throw normalizeCameraError(error);
    }).finally(() => {
      if (this.pending === request) this.pending = null;
    });

    this.pending = request;
    return request;
  }

  stop(): void {
    this.generation += 1;
    this.pending = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

export const cameraService = new CameraService();
