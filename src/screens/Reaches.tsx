/**
 * What you reached for today.
 *
 * Reached here on purpose and no other way. Nothing brings someone to this
 * screen — no prompt, no hint, no highlight suggesting there is something new
 * to look at (FR-030a, FR-030b).
 *
 * The tone is the whole design. A reach is information, not a failure: no
 * congratulation for a short list, no shame for a long one, no comparison with
 * yesterday, no total to beat. Just what happened, and what Cairn did not see.
 */
import { useEffect, useState } from 'react';

import { Card } from '../components/Card';
import { listTodaysReaches, type TodaysReaches } from '../ipc/reaches';

export function Reaches({ today }: { today?: TodaysReaches }) {
  const [day, setDay] = useState<TodaysReaches | undefined>(today);

  useEffect(() => {
    if (today) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dayStart = Math.round(start.getTime() / 1000);
    listTodaysReaches(dayStart, dayStart + 86_400)
      .then(setDay)
      .catch(() => undefined);
  }, [today]);

  if (!day) {
    return (
      <Card>
        <p className="text-ink-400">Looking…</p>
      </Card>
    );
  }

  if (day.sealed) {
    return (
      <Card>
        <h2 className="reflective text-3xl text-ink-900">Today</h2>
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">{day.sealed}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">Today</h2>

      {day.reaches.length === 0 ? (
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">
          Nothing here for today.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-sand-200">
          {day.reaches.map((reach, index) => (
            <li
              key={`${reach.domain}-${reach.at}-${index}`}
              className="flex items-baseline justify-between py-3"
            >
              <span className="text-ink-900">{reach.domain}</span>
              <span className="text-sm text-ink-400">{timeOfDay(reach.at)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="reflective mt-8 border-t border-sand-200 pt-6 text-ink-500">
        {day.coverage_note ??
          'Cairn counts only while it is running. This is what it saw today.'}
      </p>
    </Card>
  );
}

function timeOfDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
