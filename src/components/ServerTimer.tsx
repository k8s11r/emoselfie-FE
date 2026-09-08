import { useEffect, useState } from 'react';
import { remainingSeconds } from '../time/serverClock';

type ServerTimerProps = {
  endsAtMs: number;
  now?: () => number;
  label: string;
};

export function ServerTimer({ endsAtMs, now = Date.now, label }: ServerTimerProps) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(endsAtMs, now()));

  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(endsAtMs, now()));
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [endsAtMs, now]);

  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = String(seconds % 60).padStart(2, '0');

  return (
    <time className="server-timer" dateTime={`PT${seconds}S`} aria-label={`${label} ${seconds}초`}>
      {String(minutesPart).padStart(2, '0')}:{secondsPart}
    </time>
  );
}

