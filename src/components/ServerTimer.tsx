import { useEffect, useState } from 'react';
import { remainingSeconds, serverNow } from '../time/serverClock';

type ServerTimerProps = {
  endsAtMs: number;
  now?: () => number;
  label: string;
};

export function ServerTimer({ endsAtMs, now = serverNow, label }: ServerTimerProps) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(endsAtMs, now()));

  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(endsAtMs, now()));
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [endsAtMs, now]);

  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = String(seconds % 60).padStart(2, '0');
  // RD-09: emphasise the last 10 seconds. Weight and the "곧 마감" label carry
  // the state alongside colour, and there is no sound, vibration or auto-submit.
  const urgent = seconds > 0 && seconds <= 10;

  return (
    <time
      className={urgent ? 'server-timer server-timer--urgent' : 'server-timer'}
      data-urgent={urgent || undefined}
      dateTime={`PT${seconds}S`}
      aria-label={urgent ? `${label} ${seconds}초, 곧 마감` : `${label} ${seconds}초`}
    >
      {String(minutesPart).padStart(2, '0')}:{secondsPart}
      {urgent ? <span className="server-timer__urgent-note">곧 마감</span> : null}
    </time>
  );
}

