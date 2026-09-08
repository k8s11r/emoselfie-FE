import { describe, expect, it, vi } from 'vitest';
import { CameraAccessError, normalizeCameraError, verifyCameraAccess } from './permission';

describe('camera permission', () => {
  it('권한 거부 오류를 사용자 분기로 정규화한다', () => {
    const error = normalizeCameraError(new DOMException('denied', 'NotAllowedError'));

    expect(error).toBeInstanceOf(CameraAccessError);
    expect(error.reason).toBe('denied');
  });

  it('카메라 확인 뒤 임시 스트림의 모든 트랙을 정리한다', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }, { stop }] });

    await verifyCameraAccess({ getUserMedia } as unknown as MediaDevices);

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: 'user' } },
    });
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('미지원 환경은 권한 요청 전에 차단한다', async () => {
    await expect(verifyCameraAccess(undefined)).rejects.toMatchObject({ reason: 'unsupported' });
  });
});
