import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPhotoResource, releasePhotoResource } from './photoResource';

describe('photo resource', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Blob URL을 만들고 촬영 확인이 끝나면 해제한다', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:preview');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' });

    const photo = createPhotoResource(blob);
    releasePhotoResource(photo);

    expect(photo).toEqual({ blob, url: 'blob:preview' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
