/**
 * Protection, at a glance.
 *
 * The state shown here comes from a read-back of the machine, never from a
 * write that returned success — and `not_verified` is its own state with its
 * own words, never rendered as protected (FR-011, FR-012).
 */
import { useEffect, useState, type ReactNode } from 'react';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useNotebookPage } from '../shell/notebookPage';
import {
  cancelPendingChange,
  getProtectionState,
  protectionWords,
  type PendingChange,
  type ProtectionState,
} from '../ipc';

const toneClasses = {
  moss: 'bg-moss-100 text-moss-600',
  amber: 'bg-amber-100 text-amber-600',
  quiet: 'bg-sand-100 text-ink-500',
} as const;

export function Protection({
  state,
  pending,
  onCancelled,
}: {
  state?: ProtectionState;
  pending?: PendingChange | null;
  onCancelled?: () => void;
}) {
  const [current, setCurrent] = useState<ProtectionState | undefined>(state);
  const [trouble, setTrouble] = useState<string>();
  const onPage = useNotebookPage();

  useEffect(() => {
    if (state) return;
    getProtectionState().then(setCurrent).catch((problem) => setTrouble(String(problem)));
  }, [state]);

  if (trouble) {
    return (
      <Card>
        <p className="text-ink-500">{trouble}</p>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card>
        <p className="text-ink-400">Checking this machine…</p>
      </Card>
    );
  }

  const words = protectionWords[current.status];

  if (onPage) {
    return (
      <Spread right={pending && <Waiting pending={pending} onCancelled={onCancelled} />}>
        <span className={`nb-state ${toneClasses[words.tone]}`}>{words.title}</span>
        <h2 className="nb-state-title">{words.title}</h2>
        <p className="nb-state-detail">{words.detail}</p>
        {current.status !== 'off' && (
          <dl className="nb-figures">
            <div className="nb-figure">
              <dt className="nb-figure__label">Addresses in force</dt>
              <dd className="nb-figure__value">{current.entry_count_verified}</dd>
            </div>
            <div className="nb-figure">
              <dt className="nb-figure__label">Last checked</dt>
              <dd className="nb-figure__value">
                {current.verified_at ? whenWas(current.verified_at) : 'not yet'}
              </dd>
            </div>
          </dl>
        )}
      </Spread>
    );
  }

  return (
    <Card>
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase ${toneClasses[words.tone]}`}
      >
        {words.title}
      </span>

      <h2 className="reflective mt-6 text-3xl text-ink-900">{words.title}</h2>
      <p className="reflective mt-3 max-w-prose text-lg text-ink-700">{words.detail}</p>

      {pending && <Waiting pending={pending} onCancelled={onCancelled} />}

      {current.status !== 'off' && (
        <dl className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <dt className="text-ink-400">Addresses in force</dt>
            <dd className="mt-1 text-2xl text-ink-900">{current.entry_count_verified}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Last checked</dt>
            <dd className="mt-1 text-2xl text-ink-900">
              {current.verified_at ? whenWas(current.verified_at) : 'not yet'}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

/** The notebook's two pages: what is said on the left, a blank ruled page (or a note) on the right. */
function Spread({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="nb-spread">
      <div className="nb-page">{children}</div>
      <div className="nb-page nb-page--ruled">{right}</div>
    </div>
  );
}

/**
 * A change that is waiting.
 *
 * Shown wherever protection is shown (FR-047e), and nowhere that would draw
 * someone back to it. The time left is a phrase, not a ticking number: a
 * countdown is something to sit and watch.
 */
function Waiting({
  pending,
  onCancelled,
}: {
  pending: PendingChange;
  onCancelled?: () => void;
}) {
  const onPage = useNotebookPage();
  const sentence = pending.eligible_now
    ? 'This is ready to take effect.'
    : `This takes effect in ${pending.time_remaining}. Until then, nothing changes.`;
  const cancel = async () => {
    await cancelPendingChange(pending.id);
    onCancelled?.();
  };

  if (onPage) {
    return (
      <div className="nb-note">
        <p className="nb-note__what">{pending.what}</p>
        <p className="nb-note__sentence">{sentence}</p>
        <Button tone="quiet" className="nb-note__button" onClick={cancel}>
          Keep things as they are
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl bg-amber-100 p-6">
      <p className="text-ink-900">{pending.what}</p>
      <p className="reflective mt-2 text-ink-700">{sentence}</p>
      <Button
        tone="quiet"
        className="mt-4 -ml-2"
        onClick={cancel}
      >
        Keep things as they are
      </Button>
    </div>
  );
}

/** Rough, human, and never a countdown. */
function whenWas(seconds: number): string {
  const ago = Math.max(0, Math.round(Date.now() / 1000 - seconds));
  if (ago < 90) return 'just now';
  if (ago < 3600) return `${Math.round(ago / 60)} minutes ago`;
  if (ago < 86400) return `${Math.round(ago / 3600)} hours ago`;
  return `${Math.round(ago / 86400)} days ago`;
}
