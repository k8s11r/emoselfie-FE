import { ApiError } from '../api/errors';
import { getRoomState } from '../api/roomEntry';
import { useRoomStore } from '../stores/roomStore';

let activeRestore: ((background?: boolean) => Promise<boolean>) | null = null;
export function restoreCurrentRoom(background = false): Promise<boolean> {
  return activeRestore?.(background) ?? Promise.resolve(false);
}

// Without a server revision/replay cursor, accept a snapshot only if no room
// event arrived during its request. Bound retries instead of applying stale data.
export function createRoomRestorer(slug: string) {
  let revision = 0;
  let disposed = false;
  let controller: AbortController | null = null;
  let pending: Promise<boolean> | null = null;
  let generation = 0;
  let foregroundRequested = false;
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  const restore = (background = false): Promise<boolean> => {
    if (disposed) return Promise.resolve(false);
    if (pending) {
      if (!background) { foregroundRequested = true; useRoomStore.getState().setRestoring(true); }
      return pending;
    }
    foregroundRequested = !background;
    const requestGeneration = ++generation;
    controller = new AbortController();
    const signal = controller.signal;
    const requestController = controller;
    const timeout = setTimeout(() => requestController.abort(), 10_000);
    requestTimer = timeout;
    if (!background) useRoomStore.getState().setRestoring(true);
    pending = (async () => {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const before = revision;
          const beforeGame = useRoomStore.getState().game;
          const beforeUpload = useRoomStore.getState().uploadRoundId;
          const snapshot = await getRoomState(slug, signal);
          if (disposed || signal.aborted || requestGeneration !== generation) return false;
          if (before !== revision || beforeGame !== useRoomStore.getState().game || beforeUpload !== useRoomStore.getState().uploadRoundId) continue;
          if (useRoomStore.getState().snapshot?.room.slug !== slug) return false;
          useRoomStore.getState().hydrate(snapshot);
          return true;
        }
        throw new Error('ROOM_CHANGED_DURING_RESTORE');
      } catch (error) {
        if (!disposed && requestGeneration === generation) {
          if (error instanceof ApiError && error.code === 'ROOM_CLOSED') { useRoomStore.getState().close('closed'); return false; }
          if (foregroundRequested) useRoomStore.getState().setRestoring(false, '현재 게임 상태를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.');
          else useRoomStore.getState().setRestoreWarning('이전에 제출된 결과를 불러오지 못했어요. 현재 도착한 결과를 표시하고 있어요.');
        }
        return false;
      } finally {
        clearTimeout(timeout);
        if (requestGeneration === generation) pending = null;
      }
    })();
    return pending;
  };
  activeRestore = restore;
  const suspend = () => {
    generation += 1;
    controller?.abort();
    clearTimeout(requestTimer);
    if (useRoomStore.getState().snapshot?.room.slug === slug) useRoomStore.getState().setRestoring(false);
    pending = null;
  };
  return {
    restore,
    changed: () => { revision += 1; },
    suspend,
    dispose: () => { disposed = true; suspend(); if (activeRestore === restore) activeRestore = null; },
  };
}
