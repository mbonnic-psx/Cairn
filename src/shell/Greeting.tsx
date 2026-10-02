/**
 * The morning greeting: the words, then the true weekday and time in the
 * computer's own locale. It keeps up by waking on each minute boundary, and
 * holds nothing else: nothing that counts or accumulates.
 */
import { useEffect, useState } from 'react';

import { formatWeekdayTime, greetingFor } from '../look/look';

export function Greeting() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const current = new Date();
    const untilNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
    const first = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, untilNextMinute);
    return () => {
      clearTimeout(first);
      if (interval !== undefined) clearInterval(interval);
    };
  }, []);

  return (
    <div className="nb-greeting">
      <span className="nb-greeting__time">{formatWeekdayTime(now)}</span>
      <h2 className="nb-greeting__words">{greetingFor('morning')}</h2>
    </div>
  );
}
