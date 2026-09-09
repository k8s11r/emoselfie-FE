import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import { uploadSubmission } from './submissions';

describe('uploadSubmission', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('브라우저가 multipart boundary를 만들도록 Content-Type 없이 JPEG를 전송한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      submissionId: '913',
      acceptedAtMs: 1757203355120,
      status: 'processing',
    }), { status: 202, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    await uploadSubmission({ slug: 'Xk9mQ2vB7nLp', roundId: '87', captureToken: 'private-token', image });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/rooms/Xk9mQ2vB7nLp/rounds/87/submissions');
    expect(init.headers).toEqual({ 'X-Capture-Token': 'private-token' });
    expect((init.body as FormData).get('image')).toBeInstanceOf(Blob);
  });

  it('JPEG가 아닌 데이터는 네트워크 요청 전에 거절한다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadSubmission({
      slug: 'Xk9mQ2vB7nLp',
      roundId: '87',
      captureToken: 'private-token',
      image: new Blob(['png'], { type: 'image/png' }),
    })).rejects.toMatchObject<Partial<ApiError>>({ code: 'UNSUPPORTED_MEDIA' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
