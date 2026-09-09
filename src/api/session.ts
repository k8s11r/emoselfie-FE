import { z } from 'zod';
import { apiRequest } from './client';

export const meSchema = z.object({
  nickname: z.string().nullable(),
  hasActiveRoom: z.boolean(),
  activeRoomSlug: z.string().nullable(),
});

const nicknameResponseSchema = z.union([
  meSchema,
  z.object({ nickname: z.string() }),
]);

export type Me = z.infer<typeof meSchema>;

export function getMe(): Promise<Me> {
  return apiRequest('/api/me', meSchema);
}

export function updateNickname(nickname: string): Promise<{ nickname: string | null }> {
  return apiRequest('/api/me', nicknameResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  });
}
