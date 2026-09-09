import { afterEach, describe, expect, it, vi } from 'vitest';
import { estimateClockOffset, remainingSeconds, serverNow, syncServerClock } from './serverClock';

describe('serverClock', () => {
  it('남은 시간을 올림하고 0 미만으로 내리지 않는다', () => {
    expect(remainingSeconds(10_001, 10_000)).toBe(1);
    expect(remainingSeconds(11_000, 10_000)).toBe(1);
    expect(remainingSeconds(9_000, 10_000)).toBe(0);
  });

  it('왕복 시간의 중간점을 기준으로 서버 시계 오차를 계산한다', () => {
    expect(estimateClockOffset(10_150, 10_000, 10_100)).toBe(100);
  });
});



afterEach(() => vi.restoreAllMocks());
it('동기화 후 기기 시계 변경과 관계없이 monotonic 시간으로 진행한다', () => {
  const performanceMock = vi.spyOn(performance, 'now').mockReturnValue(200);
  syncServerClock(10_000, 100, 200);
  expect(serverNow()).toBe(10_050);
  vi.spyOn(Date, 'now').mockReturnValue(99_999_999);
  performanceMock.mockReturnValue(700);
  expect(serverNow()).toBe(10_550);
});
