import { describe, expect, it } from 'vitest';
import { toApiError } from './errors';

describe('toApiError', () => {
  it('서버 오류 코드를 안정적인 ApiError로 변환한다', async () => {
    const response = new Response(JSON.stringify({ error: { code: 'ROOM_FULL', message: '방이 가득 찼어요' } }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(toApiError(response)).resolves.toMatchObject({
      code: 'ROOM_FULL',
      message: '방이 가득 찼어요',
      status: 409,
    });
  });
});

