import { io, type Socket } from 'socket.io-client';
import { lobbySnapshotSchema, participantSchema, roomJoinedSchema, toLobbySnapshot } from '../api/roomEntry';
import { safeLogger } from '../logging/safeLogger';
import { useRoomStore } from '../stores/roomStore';

let socket: Socket | null = null;
let releaseSocket: (() => void) | null = null;

export function connectRoomSocket(slug: string, path = '/socket.io'): () => void {
  releaseSocket?.();
  const next = io({ path, query: { slug }, autoConnect: false, transports: ['websocket', 'polling'] });
  socket = next;
  const store = useRoomStore.getState();
  store.setConnection('connecting');

  next.on('connect', () => useRoomStore.getState().setConnection('connected'));
  next.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') useRoomStore.getState().setConnection('reconnecting');
  });
  next.on('connect_error', () => useRoomStore.getState().setConnection('offline'));
  next.on('room:joined', (payload: unknown) => {
    const parsed = roomJoinedSchema.safeParse(payload);
    if (parsed.success && parsed.data.room.slug === slug) useRoomStore.getState().hydrate(toLobbySnapshot(parsed.data));
    else safeLogger.warn('room:joined 형식 불일치');
  });
  next.on('participant:updated', (payload: unknown) => {
    const parsed = participantSchema.partial().required({ participantId: true }).safeParse(payload);
    if (parsed.success) useRoomStore.getState().updateParticipant(parsed.data);
  });
  next.on('participant:removed', (payload: unknown) => {
    const participantId = typeof payload === 'object' && payload && 'participantId' in payload ? String(payload.participantId) : null;
    if (participantId) useRoomStore.getState().removeParticipant(participantId);
  });
  next.on('host:changed', (payload: unknown) => {
    const participantId = typeof payload === 'object' && payload && 'hostParticipantId' in payload ? String(payload.hostParticipantId) : null;
    if (participantId) useRoomStore.getState().updateHost(participantId);
  });
  next.on('room:settingsUpdated', (payload: unknown) => {
    const current = useRoomStore.getState().snapshot;
    const parsed = current?.room.settings ? lobbySnapshotSchema.shape.room.shape.settings.safeParse(
      typeof payload === 'object' && payload && 'settings' in payload ? payload.settings : payload,
    ) : null;
    if (parsed?.success) useRoomStore.getState().updateSettings(parsed.data);
  });
  next.on('session:superseded', () => {
    useRoomStore.getState().setConnection('superseded');
    next.disconnect();
  });

  next.connect();

  const release = () => {
    if (socket === next) {
      socket = null;
      releaseSocket = null;
    }
    next.removeAllListeners();
    next.disconnect();
  };
  releaseSocket = release;
  return release;
}
