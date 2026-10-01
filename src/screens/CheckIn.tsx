/**
 * The check-in: today's reaches beside a space to write.
 *
 * Reached by navigation and no other way in this slice; the one quiet evening
 * notice arrives with `evening-notice`. The writing is the point, so the space
 * is offered whether today held reaches or none, and nothing here scores the
 * day, congratulates it, or calls it anything (FR-032).
 *
 * The day is fixed when the check-in opens. Left open across midnight, it stays
 * attached to the day it was opened for rather than becoming tomorrow's.
 *
 * Nothing here leads to a change in protection (Principle I).
 */
import { useEffect, useRef, useState } from 'react';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getDayView, saveJournalEntry, type DayView } from '../ipc/journal';

interface Today {
  day: string;
  start: number;
  end: number;
}

/** Today's local date and its two local midnights. Not start + 24 h: a day can be 23 or 25 hours long. */
function today(): Today {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    day: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    start: Math.round(start.getTime() / 1000),
    end: Math.round(end.getTime() / 1000),
  };
}

export function CheckIn() {
  const [opened] = useState(today);
  const [view, setView] = useState<DayView>();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string>();
  const [kept, setKept] = useState(false);
  const [keeping, setKeeping] = useState(false);
  // The space as it is now, for a save that returns after more was typed.
  const latest = useRef(draft);
  latest.current = draft;

  useEffect(() => {
    getDayView(opened.day, opened.start, opened.end)
      .then((found) => {
        setView(found);
        setDraft(found.entry ?? '');
      })
      .catch((problem: unknown) => setNote(String(problem)));
  }, [opened]);

  async function keep() {
    const sent = draft;
    setKeeping(true);
    setKept(false);
    setNote(undefined);
    try {
      const after = await saveJournalEntry(opened.day, opened.start, opened.end, sent);
      setView(after);
      // Whatever is in the space now stays. Only when it is still what was
      // sent does the screen say so; anything typed since is not yet kept,
      // and the screen makes no claim either way.
      if (latest.current === sent) {
        setDraft(after.entry ?? sent);
        setKept(true);
      }
    } catch (problem) {
      // What they typed stays exactly where it is (G1).
      setNote(String(problem));
    } finally {
      setKeeping(false);
    }
  }

  if (!view) {
    return (
      <Card>
        <p className="text-ink-400">{note ?? 'Looking…'}</p>
      </Card>
    );
  }

  if (view.sealed) {
    return (
      <Card>
        <h2 className="reflective text-3xl text-ink-900">Tonight</h2>
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">{view.sealed}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">Tonight</h2>

      {view.reaches.length === 0 ? (
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">Nothing here for today.</p>
      ) : (
        <ul className="mt-8 divide-y divide-sand-200">
          {view.reaches.map((reach, index) => (
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

      {view.coverage_note && (
        <p className="reflective mt-6 text-ink-500">{view.coverage_note}</p>
      )}

      <label className="mt-10 block">
        <span className="reflective text-xl text-ink-700">How the day went</span>
        <textarea
          className="reflective mt-3 block min-h-48 w-full rounded-lg border border-sand-200 bg-sand-50 p-4 text-lg leading-relaxed text-ink-900 focus:border-clay-500 focus:outline-none"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setKept(false);
          }}
        />
      </label>

      <div className="mt-4 flex items-center gap-4">
        <Button onClick={keep} disabled={keeping || draft.trim() === ''}>
          Keep this
        </Button>
      </div>

      {/* One polite live region for what happened to the save, so a person
          who cannot see the page hears it too: a refusal heard by nobody is
          the lost entry G1 exists to prevent. */}
      <p role="status" aria-live="polite" className="reflective mt-4 max-w-prose text-ink-700">
        {note ?? (kept ? 'Kept for today.' : '')}
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
