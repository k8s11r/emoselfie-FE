export const DEFAULT_JPEG_QUALITY = 0.8;
export const DEFAULT_MAX_DIMENSION = 720;

export class CaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaptureError';
  }
}

export function calculateScaledSize(width: number, height: number, maxDimension = DEFAULT_MAX_DIMENSION) {
  if (width <= 0 || height <= 0 || maxDimension <= 0) throw new CaptureError('카메라 프레임 크기가 올바르지 않아요.');
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

type CaptureOptions = {
  maxDimension?: number;
  quality?: number;
  createCanvas?: () => HTMLCanvasElement;
};

export async function captureVideoFrame(video: HTMLVideoElement, options: CaptureOptions = {}): Promise<Blob> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const { width, height } = calculateScaledSize(sourceWidth, sourceHeight, options.maxDimension ?? DEFAULT_MAX_DIMENSION);
  const canvas = options.createCanvas?.() ?? document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new CaptureError('사진을 처리할 수 없는 브라우저예요.');

  // Q-7: encode the full frame in mirror orientation once; review/results display this Blob as-is.
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', options.quality ?? DEFAULT_JPEG_QUALITY);
  });
  if (!blob || blob.size === 0 || blob.type !== 'image/jpeg') {
    throw new CaptureError('사진을 JPEG로 만들지 못했어요. 다시 찍어 주세요.');
  }
  return blob;
}
