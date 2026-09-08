import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { gameEventSchemas, parseGameEvent, type GameEventName } from '../api/game';
import { createRoomRestorer } from './restore';
import { participantSchema, roomJoinedSchema, toLobbySnapshot } from '../api/roomEntry';
import { roomSettingsSchema } from '../api/rooms';
import { safeLogger } from '../logging/safeLogger';
import { useRoomStore } from '../stores/roomStore';

let releaseSocket: (() => void) | null = null;
const hostChangedSchema = z.object({ hostParticipantId: z.string().min(1), temporary: z.boolean() });
const roomClosedSchema = z.object({ reason: z.enum(['host_closed', 'expired']) });
const removedSchema = z.object({ participantId: z.string().min(1) });
const ackSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) }),
]);

export function connectRoomSocket(slug: string, path = '/socket.io'): () => void {
  releaseSocket?.();
  const next: Socket = io({ path, query: { slug }, autoConnect: false, transports: ['websocket', 'polling'] });
  const restorer = createRoomRestorer(slug);
  let needsRestore = false;
  let released = false;
  let joined = false;
  let generation = 0;
  let presenceTimer: ReturnType<typeof setInterval> | undefined;
  let ackTimer: ReturnType<typeof setTimeout> | undefined;
  const stopPresence = () => {
    joined = false;
    generation += 1;
    clearInterval(presenceTimer);
    clearTimeout(ackTimer);
    presenceTimer = undefined;
    ackTimer = undefined;
  };
  const release = () => {
    if (released) return;
    released = true;
    stopPresence();
    restorer.dispose();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    if (releaseSocket === release) releaseSocket = null;
    next.removeAllListeners();
    next.disconnect();
  };
  releaseSocket = release;
  useRoomStore.getState().setConnection('connecting');

  const ping = () => {
    if (released || !joined || ackTimer !== undefined) return;
    const requestGeneration = ++generation;
    ackTimer = setTimeout(() => {
      ackTimer = undefined;
      generation += 1;
      useRoomStore.getState().setConnection('offline');
    }, 10_000);
    next.emit('presence:ping', {}, (payload: unknown) => {
      if (released || !joined || requestGeneration !== generation) return;
      clearTimeout(ackTimer);
      ackTimer = undefined;
      generation += 1;
      const parsed = ackSchema.safeParse(payload);
      useRoomStore.getState().setConnection(parsed.success && parsed.data.ok ? 'connected' : 'offline');
    });
  };

  next.on('connect', () => {
    // Python Socket.IO may deliver room:joined before the transport connect event.
    if (!joined) useRoomStore.getState().setConnection('connecting');
  });
  next.on('disconnect', () => {
    needsRestore = true;
    restorer.suspend();
    stopPresence();
    useRoomStore.getState().setConnection('reconnecting');
  });
  next.on('connect_error', () => {
    stopPresence();
    useRoomStore.getState().setConnection('offline');
  });
  next.on('room:joined', (payload: unknown) => {
    const parsed = roomJoinedSchema.safeParse(payload);
    if (!parsed.success || parsed.data.room.slug !== slug) {
      safeLogger.warn('room:joined 형식 불일치');
      return;
    }
    stopPresence();
    restorer.changed();
    try {
      if (!needsRestore) useRoomStore.getState().hydrate(toLobbySnapshot(parsed.data));
    } catch {
      useRoomStore.getState().setRestoring(false, '현재 게임 상태를 확인하지 못했어요.');
      return;
    }
    if (needsRestore) {
      needsRestore = false;
      void restorer.restore();
    }
    joined = true;
    useRoomStore.getState().setConnection('connected');
    presenceTimer = setInterval(ping, 25_000);
  });
  next.on('participant:updated', (payload: unknown) => {
    restorer.changed();
    const parsed = participantSchema.partial().required({ participantId: true }).safeParse(payload);
    if (parsed.success) useRoomStore.getState().updateParticipant(parsed.data);
  });
  next.on('participant:removed', (payload: unknown) => {
    restorer.changed();
    const parsed = removedSchema.safeParse(payload);
    if (parsed.success) useRoomStore.getState().removeParticipant(parsed.data.participantId);
  });
  next.on('host:changed', (payload: unknown) => {
    restorer.changed();
    const parsed = hostChangedSchema.safeParse(payload);
    if (parsed.success) useRoomStore.getState().updateHost(parsed.data.hostParticipantId, parsed.data.temporary);
  });
  next.on('room:settingsUpdated', (payload: unknown) => {
    restorer.changed();
    const parsed = z.object({ settings: roomSettingsSchema }).safeParse(payload);
    if (parsed.success) useRoomStore.getState().updateSettings(parsed.data.settings);
  });
  next.on('room:closed', (payload: unknown) => {
    const parsed = roomClosedSchema.safeParse(payload);
    if (!parsed.success) return;
    release();
    useRoomStore.getState().close(parsed.data.reason);
  });
  next.on('session:superseded', () => {
    release();
    useRoomStore.getState().setConnection('superseded');
  });

  for (const type of Object.keys(gameEventSchemas) as GameEventName[]) {
    next.on(type, (payload: unknown) => {
      const event = parseGameEvent(type, payload);
      if (!event) { safeLogger.warn('게임 이벤트 형식 불일치'); return; }
      restorer.changed();
      const current = useRoomStore.getState().game;
      if (event.type === 'game:finished' || (event.type === 'round:revealed' && (!current || !('index' in current) || event.payload.index > current.index))) restorer.suspend();
      useRoomStore.getState().applyGameEvent(event);
    });
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && joined) void restorer.restore();
  };
  const onOnline = () => { if (joined) void restorer.restore(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  next.connect();
  return release;
}
