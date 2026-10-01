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

/**
 * Text that shows nothing is empty (G4), here as in the store: the same
 * definition as `shows_nothing` in `src-tauri/src/domain/visible.rs`, and both
 * are tested against `src-tauri/tests/fixtures/nothing_visible.json`.
 *
 * Every character is White_Space (PropList.txt), a control (Cc), a
 * Default_Ignorable_Code_Point (DerivedCoreProperties.txt, Unicode 15) or one
 * of the blank-looking letters. Ranges are written out rather than taken from
 * `\p{...}` so the answer does not move with the browser's Unicode version.
 */
// The class holds combining and joining characters on purpose: they are what it names.
const NOTHING_VISIBLE = new RegExp(
  // eslint-disable-next-line no-misleading-character-class
  '^[' +
    // White_Space
    '\\u0009-\\u000D\\u0020\\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000' +
    // Cc: C0 and C1 controls, NUL included
    '\\u0000-\\u001F\\u007F-\\u009F' +
    // Default_Ignorable_Code_Point
    '\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180F\\u200B-\\u200F' +
    '\\u202A-\\u202E\\u2060-\\u206F\\u3164\\uFE00-\\uFE0F\\uFEFF\\uFFA0\\uFFF0-\\uFFF8' +
    '\\u{1BCA0}-\\u{1BCA3}\\u{1D173}-\\u{1D17A}\\u{E0000}-\\u{E0FFF}' +
    // Blank-looking letters: the braille blank (the Hangul fillers are above)
    '\\u2800' +
    ']*$',
  'u',
);

export function showsNothing(text: string): boolean {
  return NOTHING_VISIBLE.test(text);
}

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

/** What the check-in has in hand, kept by whoever holds the hook. */
export interface CheckInSession {
  /** What is in the space; undefined until the person types, so the saved entry shows. */
  draft: string | undefined;
  /** The core's sentence for a save that was not kept, shown beside the text. */
  note: string | undefined;
  kept: boolean;
  keeping: boolean;
  type: (text: string) => void;
  keep: (when: Today, shown: string) => Promise<DayView | undefined>;
}

/**
 * The draft and the outcome of a save, held above the screen so that walking
 * round the header neither loses the text nor a refusal that arrived while
 * away (G1). Nothing here is shown anywhere but the check-in itself (FR-033).
 */
export function useCheckInSession(): CheckInSession {
  const [draft, setDraft] = useState<string>();
  const [note, setNote] = useState<string>();
  const [kept, setKept] = useState(false);
  const [keeping, setKeeping] = useState(false);
  // The space as it is now, for a save that returns after more was typed.
  const latest = useRef<string>();
  latest.current = draft;

  return {
    draft,
    note,
    kept,
    keeping,
    type(text) {
      latest.current = text;
      setDraft(text);
      setKept(false);
    },
    async keep(when, shown) {
      const sent = latest.current ?? shown;
      setKeeping(true);
      setKept(false);
      setNote(undefined);
      try {
        const after = await saveJournalEntry(when.day, when.start, when.end, sent);
        // Whatever is in the space now stays. Only when it is still what was
        // sent does the screen say so; anything typed since is not yet kept,
        // and the screen makes no claim either way.
        if ((latest.current ?? shown) === sent) {
          setDraft(after.entry ?? sent);
          setKept(true);
        }
        return after;
      } catch (problem) {
        // What they typed stays exactly where it is (G1).
        setNote(String(problem));
        return undefined;
      } finally {
        setKeeping(false);
      }
    },
  };
}

export function CheckIn({ session }: { session?: CheckInSession }) {
  const own = useCheckInSession();
  const { draft: typed, note: saveNote, kept, keeping, type, keep } = session ?? own;
  const [opened] = useState(today);
  const [view, setView] = useState<DayView>();
  const [loadNote, setLoadNote] = useState<string>();

  useEffect(() => {
    getDayView(opened.day, opened.start, opened.end)
      .then(setView)
      .catch((problem: unknown) => setLoadNote(String(problem)));
  }, [opened]);

  const note = saveNote ?? loadNote;
  const draft = typed ?? view?.entry ?? '';

  if (!view) {
    return (
      <Card>
        <p className="text-ink-400">{loadNote ?? 'Looking…'}</p>
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
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">
          Nothing here for today.
        </p>
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
            type(event.target.value);
          }}
        />
      </label>

      <div className="mt-4 flex items-center gap-4">
        <Button
          onClick={() => keep(opened, draft).then((after) => after && setView(after))}
          disabled={keeping || showsNothing(draft)}
        >
          Keep this
        </Button>
      </div>

      {/* One polite live region for what happened to the save, so a person
          who cannot see the page hears it too: a refusal heard by nobody is
          the lost entry G1 exists to prevent. */}
      <p
        role="status"
        aria-live="polite"
        className="reflective mt-4 max-w-prose text-ink-700"
      >
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
