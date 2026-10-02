/**
 * The greeting: the words of the look on screen, then the true weekday and time in the
 * computer's own locale. It keeps up by waking on each minute boundary,
 * re-reading the clock on every wake, on focus and when shown again, and holds
 * nothing else: nothing that counts or accumulates.
 */
import { useEffect, useState } from 'react';

import { formatWeekdayTime, greetingFor, type Look } from '../look/look';

export function Greeting({ look }: { look: Look }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Read the clock, show it, and aim the next wake at the next :00 of the
    // clock as it is now, so a sleep or a hand-set clock never leaves it off.
    const sync = () => {
      if (timer !== undefined) clearTimeout(timer);
      const current = new Date();
      setNow(current);
      const untilNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
      timer = setTimeout(sync, untilNextMinute);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    sync();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', sync);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return (
    <div className="nb-greeting">
      <span className="nb-greeting__time">{formatWeekdayTime(now)}</span>
      <h2 className="nb-greeting__words">{greetingFor(look)}</h2>
    </div>
  );
}
