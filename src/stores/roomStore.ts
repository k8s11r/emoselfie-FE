import { create } from 'zustand';
import type { LobbySnapshot, Participant } from '../api/roomEntry';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'superseded';

type RoomState = {
  snapshot: LobbySnapshot | null;
  connection: ConnectionState;
  hydrate: (snapshot: LobbySnapshot) => void;
  setConnection: (connection: ConnectionState) => void;
  replaceParticipants: (participants: Participant[]) => void;
  updateParticipant: (participant: Pick<Participant, 'participantId'> & Partial<Participant>) => void;
  removeParticipant: (participantId: string) => void;
  updateHost: (participantId: string) => void;
  updateSettings: (settings: LobbySnapshot['room']['settings']) => void;
  clear: () => void;
};

export const useRoomStore = create<RoomState>((set) => ({
  snapshot: null,
  connection: 'idle',
  hydrate: (snapshot) => set({ snapshot }),
  setConnection: (connection) => set({ connection }),
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
  updateHost: (participantId) => set((state) => {
    if (!state.snapshot) return state;
    return {
      snapshot: {
        ...state.snapshot,
        me: { ...state.snapshot.me, isHost: state.snapshot.me.participantId === participantId },
        participants: state.snapshot.participants.map((item) => ({ ...item, isHost: item.participantId === participantId })),
      },
    };
  }),
  updateSettings: (settings) => set((state) => state.snapshot ? ({
    snapshot: { ...state.snapshot, room: { ...state.snapshot.room, settings } },
  }) : state),
  clear: () => set({ snapshot: null, connection: 'idle' }),
}));

