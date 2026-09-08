import { z } from 'zod';
import { apiRequest } from './client';

export const roomSettingsSchema = z.object({
  roundCount: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  timeLimitSec: z.union([z.literal(15), z.literal(20), z.literal(30)]),
  emotionSet: z.string().optional(),
});

export const createRoomResponseSchema = z.object({
  slug: z.string().min(12),
  status: z.literal('waiting'),
  isHost: z.literal(true),
  settings: roomSettingsSchema,
  existing: z.boolean(),
});

export type RoomSettings = z.infer<typeof roomSettingsSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;

export function createRoom(settings: Pick<RoomSettings, 'roundCount' | 'timeLimitSec'>) {
  return apiRequest('/api/rooms', createRoomResponseSchema, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

