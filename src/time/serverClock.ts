export function remainingSeconds(endsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function estimateClockOffset(serverTimeMs: number, requestStartedAtMs: number, responseReceivedAtMs: number): number {
  const midpoint = requestStartedAtMs + (responseReceivedAtMs - requestStartedAtMs) / 2;
  return serverTimeMs - midpoint;
}


let anchor: { server: number; local: number } | null = null;
export function syncServerClock(serverTimeMs: number, started: number, received: number) {
  anchor = { server: serverTimeMs + Math.max(0, received - started) / 2, local: received };
}
export function serverNow(): number {
  return anchor ? anchor.server + performance.now() - anchor.local : Date.now();
}
