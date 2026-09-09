import { describe, expect, it, vi } from 'vitest';
import { calculateScaledSize, CaptureError, captureVideoFrame } from './frame';

describe('camera frame capture', () => {
  it('비율을 유지하고 장변만 720px로 축소한다', () => {
    expect(calculateScaledSize(1920, 1080)).toEqual({ width: 720, height: 405 });
    expect(calculateScaledSize(480, 640)).toEqual({ width: 480, height: 640 });
  });

  it('JPEG 0.8로 현재 프레임을 인코딩한다', async () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
      expect(type).toBe('image/jpeg');
      expect(quality).toBe(0.8);
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, translate: vi.fn(), scale: vi.fn() }),
      toBlob,
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 1080, videoHeight: 1920 } as HTMLVideoElement;

    const blob = await captureVideoFrame(video, { createCanvas: () => canvas });

    expect(canvas.width).toBe(405);
    expect(canvas.height).toBe(720);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1080, 1920, 0, 0, 405, 720);
    expect(blob.type).toBe('image/jpeg');
  });

  it('빈 Blob은 제출 가능한 사진으로 반환하지 않는다', async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn(), translate: vi.fn(), scale: vi.fn() }),
      toBlob: (callback: BlobCallback) => callback(new Blob([], { type: 'image/jpeg' })),
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;

    await expect(captureVideoFrame(video, { createCanvas: () => canvas })).rejects.toBeInstanceOf(CaptureError);
  });

  it.each([
    [1920, 1080, 720, 405],
    [1080, 1920, 405, 720],
    [640, 480, 640, 480],
  ])('전체 %i×%i 프레임을 잘림 없이 %i×%i로 한 번만 반전한다', async (sourceWidth, sourceHeight, width, height) => {
    const drawImage = vi.fn();
    const translate = vi.fn();
    const scale = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, translate, scale }),
      toBlob: (callback: BlobCallback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: sourceWidth, videoHeight: sourceHeight } as HTMLVideoElement;

    await captureVideoFrame(video, { createCanvas: () => canvas });

    expect(canvas.width).toBe(width);
    expect(canvas.height).toBe(height);
    expect(translate).toHaveBeenCalledExactlyOnceWith(width, 0);
    expect(scale).toHaveBeenCalledExactlyOnceWith(-1, 1);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
    expect(translate.mock.invocationCallOrder[0]).toBeLessThan(scale.mock.invocationCallOrder[0]);
    expect(scale.mock.invocationCallOrder[0]).toBeLessThan(drawImage.mock.invocationCallOrder[0]);
  });
});
