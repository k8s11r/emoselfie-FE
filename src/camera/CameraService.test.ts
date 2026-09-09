import { describe, expect, it, vi } from 'vitest';
import { CameraRequestCancelledError, CameraService } from './CameraService';

function createStream() {
  const stop = vi.fn();
  const track = { readyState: 'live', stop };
  return {
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
    stop,
  };
}

describe('CameraService', () => {
  it('동시에 들어온 초기화 요청을 하나의 getUserMedia 호출로 합친다', async () => {
    const { stream } = createStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const service = new CameraService(() => ({ getUserMedia }) as unknown as MediaDevices);

    const [first, second] = await Promise.all([service.start(), service.start()]);

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(first).toBe(stream);
    expect(second).toBe(stream);
  });

  it('화면을 떠난 뒤 늦게 도착한 스트림을 즉시 중지한다', async () => {
    let resolveStream: ((stream: MediaStream) => void) | undefined;
    const pending = new Promise<MediaStream>((resolve) => { resolveStream = resolve; });
    const getUserMedia = vi.fn().mockReturnValue(pending);
    const { stream, stop } = createStream();
    const service = new CameraService(() => ({ getUserMedia }) as unknown as MediaDevices);

    const request = service.start();
    service.stop();
    resolveStream?.(stream);

    await expect(request).rejects.toBeInstanceOf(CameraRequestCancelledError);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('취소된 요청을 기다리지 않고 새 초기화를 시작할 수 있다', async () => {
    const first = createStream();
    const second = createStream();
    let resolveFirst: ((stream: MediaStream) => void) | undefined;
    const getUserMedia = vi.fn()
      .mockReturnValueOnce(new Promise<MediaStream>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(second.stream);
    const service = new CameraService(() => ({ getUserMedia }) as unknown as MediaDevices);

    const staleRequest = service.start();
    service.stop();
    const currentRequest = service.start();
    resolveFirst?.(first.stream);

    await expect(staleRequest).rejects.toBeInstanceOf(CameraRequestCancelledError);
    await expect(currentRequest).resolves.toBe(second.stream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(first.stop).toHaveBeenCalledOnce();
  });

  it('정지할 때 활성 스트림의 모든 트랙을 정리한다', async () => {
    const { stream, stop } = createStream();
    const service = new CameraService(() => ({ getUserMedia: vi.fn().mockResolvedValue(stream) }) as unknown as MediaDevices);
    await service.start();

    service.stop();

    expect(stop).toHaveBeenCalledOnce();
  });
});
