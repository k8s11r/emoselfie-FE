import type { ZodType } from 'zod';
import { toApiError } from './errors';

export async function apiRequest<T>(
  path: `/api/${string}`,
  schema: ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
  });

  if (!response.ok) throw await toApiError(response);

  const payload: unknown = await response.json();
  return schema.parse(payload);
}

