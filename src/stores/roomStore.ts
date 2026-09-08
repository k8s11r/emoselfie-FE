import { create } from 'zustand';
import type { GameEvent } from '../api/game';
import { reduceGame, restoreGame, resultView, type GameView } from './gameState';
import type { LobbySnapshot, Participant } from '../api/roomEntry';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'superseded';
export type RoomClosedReason = 'host_closed' | 'expired' | 'closed';

type RoomState = {
  snapshot: LobbySnapshot | null;
  game: GameView | null;
  restoring: boolean;
  restoreError: string | null;
  restoreWarning: string | null;
  setRestoreWarning: (warning: string | null) => void;
  uploadRoundId: string | null;
  pendingViewerEvents: GameEvent[];
  setRestoring: (restoring: boolean, error?: string | null) => void;
  applyGameEvent: (event: GameEvent) => void;
  beginUpload: (roundId: string) => boolean;
  acceptUpload: (roundId: string) => void;
  connection: ConnectionState;
  closedReason: RoomClosedReason | null;
  temporaryHost: boolean;
  close: (reason: RoomClosedReason) => void;
  hydrate: (snapshot: LobbySnapshot) => void;
  setConnection: (connection: ConnectionState) => void;
  replaceParticipants: (participants: Participant[]) => void;
  updateParticipant: (participant: Pick<Participant, 'participantId'> & Partial<Participant>) => void;
  removeParticipant: (participantId: string) => void;
  updateHost: (participantId: string, temporary: boolean) => void;
  updateSettings: (settings: LobbySnapshot['room']['settings']) => void;
  clear: () => void;
};

export const useRoomStore = create<RoomState>((set) => ({
  snapshot: null,
  game: null, restoring: false, restoreError: null, restoreWarning: null, uploadRoundId: null, pendingViewerEvents: [],
  connection: 'idle',
  closedReason: null,
  temporaryHost: false,
  close: (closedReason) => set({ snapshot: null, game: null, restoring: false, restoreError: null, restoreWarning: null, uploadRoundId: null, pendingViewerEvents: [], closedReason, connection: 'idle', temporaryHost: false }),
  hydrate: (snapshot) => set((state) => {
    if (state.closedReason) return state;
    const game = restoreGame(snapshot.game, snapshot.participants.filter((p) => p.status === 'active').length);
    // A response can confirm a consumed token, but never authorize resending it.
    const samePendingRound = game && 'roundId' in game && game.roundId === state.uploadRoundId;
    return { snapshot: { ...snapshot, game: null, room: { ...snapshot.room, status: snapshot.game?.screen === 'error_room_closed' ? 'closed' : snapshot.room.status } }, game, restoring: false, restoreError: null, restoreWarning: null,
      uploadRoundId: samePendingRound ? state.uploadRoundId : null,
      pendingViewerEvents: [],
    };
  }),
  setRestoreWarning: (restoreWarning) => set({ restoreWarning }),
  setRestoring: (restoring, restoreError = null) => set({ restoring, restoreError }),
  applyGameEvent: (event) => set((state) => {
    if (!state.snapshot || state.closedReason) return state;
    if (state.game?.screen === 'final') return state;
    const viewerEvent = ['submission:scored', 'round:finalized', 'reaction:updated', 'round:skipStatus'].includes(event.type);
    if (viewerEvent && state.uploadRoundId && state.game?.screen !== 'result'
      && 'roundId' in event.payload && event.payload.roundId === state.uploadRoundId) {
      return { pendingViewerEvents: [...state.pendingViewerEvents, event].slice(-100) };
    }
    const game = reduceGame(state.game, event);
    const points = event.type === 'game:finished' ? event.payload.ranking.find((row) => row.participantId === state.snapshot?.me.participantId)?.totalPoints
      : (event.type === 'round:finalized' || event.type === 'round:closed') && state.game && 'roundId' in state.game && state.game.roundId === event.payload.roundId
        ? event.payload.results.find((row) => row.participantId === state.snapshot?.me.participantId)?.totalPoints : undefined;
    const roomStatus = event.type === 'game:finished' ? 'finished' : event.type === 'game:started' || event.type === 'round:revealed' ? 'playing' : state.snapshot.room.status;
    return { game, ...(game !== state.game && game?.screen !== 'result' ? { restoreWarning: null } : {}), snapshot: { ...state.snapshot, me: { ...state.snapshot.me, totalPoints: points ?? state.snapshot.me.totalPoints }, game: null, room: { ...state.snapshot.room, status: roomStatus } },
      ...(game !== state.game && game?.screen !== 'result' && game?.screen !== 'capture' && game?.screen !== 'countdown'
        ? { uploadRoundId: null, pendingViewerEvents: [], restoreWarning: null } : {}),
    };
  }),
  beginUpload: (roundId) => {
    let started = false;
    set((state) => {
      if (!state.game || !('roundId' in state.game) || state.game.roundId !== roundId || state.uploadRoundId
        || !['capture', 'countdown'].includes(state.game.screen) || state.connection !== 'connected' || state.restoring || state.restoreError) return state;
      started = true;
      return { uploadRoundId: roundId, pendingViewerEvents: [] };
    });
    return started;
  },
  acceptUpload: (roundId) => set((state) => {
    if (!state.game || !('roundId' in state.game) || state.game.roundId !== roundId || !['capture', 'countdown'].includes(state.game.screen)) return state;
    return { game: state.pendingViewerEvents.reduce(reduceGame, resultView(state.game) as GameView | null), pendingViewerEvents: [] };
  }),
  setConnection: (connection) => set({ connection, ...(connection === 'superseded' ? { game: null, uploadRoundId: null, pendingViewerEvents: [], restoring: false, restoreError: null } : {}) }),
  replaceParticipants: (participants) => set((state) => state.snapshot ? ({ snapshot: { ...state.snapshot, participants } }) : state),
  updateParticipant: (participant) => set((state) => {
    if (!state.snapshot) return state;
    return {
      snapshot: {
        ...state.snapshot,
        participants: state.snapshot.participants.map((current) =>
          current.participantId === participant.participantId ? { ...current, ...participant } : current),
      },
    };
  }),
  removeParticipant: (participantId) => set((state) => state.snapshot ? ({
    snapshot: { ...state.snapshot, participants: state.snapshot.participants.filter((item) => item.participantId !== participantId) },
  }) : state),
  updateHost: (participantId, temporaryHost) => set((state) => {
    if (!state.snapshot) return state;
    return {
      temporaryHost,
      snapshot: {
        ...state.snapshot,
        me: { ...state.snapshot.me, isHost: state.snapshot.me.participantId === participantId },
        participants: state.snapshot.participants.map((item) => ({ ...item, isHost: item.participantId === participantId })),
      },
    };
  }),
  updateSettings: (settings) => set((state) => state.snapshot ? ({
    snapshot: { ...state.snapshot, room: { ...state.snapshot.room, settings: { ...state.snapshot.room.settings, ...settings } } },
  }) : state),
  clear: () => set({ snapshot: null, game: null, restoring: false, restoreError: null, restoreWarning: null, uploadRoundId: null, pendingViewerEvents: [], connection: 'idle', closedReason: null, temporaryHost: false }),
}));
