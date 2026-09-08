import { z } from 'zod';
import { apiRequest } from './client';
import { roomSettingsSchema } from './rooms';

export const roomStatusSchema = z.enum(['waiting', 'playing', 'finished', 'closed']);
export const participantStatusSchema = z.enum(['active', 'waiting_next_game', 'left']);
export const connectionStatusSchema = z.enum(['connected', 'disconnected']);

export const participantSchema = z.object({
  participantId: z.string(),
  nickname: z.string(),
  colorTag: z.number().int().min(0).max(11),
  connectionStatus: connectionStatusSchema,
  status: participantStatusSchema,
  isHost: z.boolean(),
});

export const roomPreviewSchema = z.object({
  exists: z.literal(true),
  status: roomStatusSchema,
  isFull: z.boolean(),
  isHost: z.boolean(),
  settings: roomSettingsSchema.pick({ roundCount: true, timeLimitSec: true }),
});

export const participantJoinSchema = z.object({
  participantId: z.string(),
  nickname: z.string(),
  colorTag: z.number().int().min(0).max(11),
  status: participantStatusSchema,
  isHost: z.boolean(),
  socketPath: z.string(),
});

export const lobbySnapshotSchema = z.object({
  room: z.object({
    slug: z.string(),
    status: roomStatusSchema,
    settings: roomSettingsSchema,
  }),
  me: z.object({
    participantId: z.string(),
    isHost: z.boolean(),
    status: participantStatusSchema,
    totalPoints: z.number(),
    nickname: z.string().optional(),
  }),
  participants: z.array(participantSchema),
  game: z.unknown().nullable(),
  serverTimeMs: z.number().optional(),
});

export type RoomPreview = z.infer<typeof roomPreviewSchema>;
export type ParticipantJoin = z.infer<typeof participantJoinSchema>;
export type LobbySnapshot = z.infer<typeof lobbySnapshotSchema>;
export type Participant = z.infer<typeof participantSchema>;

// BE §14 HTTP snapshots carry the server clock. §13 room:joined does not.
// Keep these wire contracts separate even though they hydrate the same store.
export const roomStateSchema = lobbySnapshotSchema.extend({
  serverTimeMs: z.number().int().nonnegative(),
});
export const roomJoinedSchema = lobbySnapshotSchema.omit({ serverTimeMs: true });

export function toLobbySnapshot(
  payload: z.infer<typeof roomJoinedSchema> | z.infer<typeof roomStateSchema>,
): LobbySnapshot {
  const nickname = payload.me.nickname
    ?? payload.participants.find((participant) => participant.participantId === payload.me.participantId)?.nickname;
  return { ...payload, me: { ...payload.me, nickname } };
}

export function getRoomPreview(slug: string): Promise<RoomPreview> {
  return apiRequest(`/api/rooms/${slug}`, roomPreviewSchema);
}

export async function getRoomState(slug: string): Promise<LobbySnapshot> {
  return toLobbySnapshot(await apiRequest(`/api/rooms/${slug}/state`, roomStateSchema));
}

export function joinRoom(slug: string, nickname: string): Promise<ParticipantJoin> {
  return apiRequest(`/api/rooms/${slug}/participants`, participantJoinSchema, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}

export function updateRoomSettings(slug: string, settings: { roundCount: 3 | 5 | 7; timeLimitSec: 15 | 20 | 30 }) {
  return apiRequest(`/api/rooms/${slug}/settings`, roomSettingsSchema, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

const actionResponseSchema = z.object({ ok: z.boolean().optional() }).passthrough();

export function startRoom(slug: string) {
  return apiRequest(`/api/rooms/${slug}/start`, actionResponseSchema, { method: 'POST' });
}

export function closeRoom(slug: string) {
  return apiRequest(`/api/rooms/${slug}/close`, actionResponseSchema, { method: 'POST' });
}
