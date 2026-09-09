import { z } from 'zod';

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    detail: z.unknown().optional(),
  }),
});

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);

  if (parsed.success) {
    return new ApiError(parsed.data.error.code, parsed.data.error.message, response.status, parsed.data.error.detail);
  }

  return new ApiError('UNEXPECTED_RESPONSE', '요청을 처리하지 못했어요. 다시 시도해 주세요.', response.status);
}

