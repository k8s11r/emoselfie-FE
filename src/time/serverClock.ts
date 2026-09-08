export function remainingSeconds(endsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function estimateClockOffset(serverTimeMs: number, requestStartedAtMs: number, responseReceivedAtMs: number): number {
  const midpoint = requestStartedAtMs + (responseReceivedAtMs - requestStartedAtMs) / 2;
  return serverTimeMs - midpoint;
}

