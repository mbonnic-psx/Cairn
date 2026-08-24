/**
 * Protection, at a glance.
 *
 * The state shown here comes from a read-back of the machine, never from a
 * write that returned success — and `not_verified` is its own state with its
 * own words, never rendered as protected (FR-011, FR-012).
 */
import { useEffect, useState } from 'react';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
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
  return (
    <div className="mt-8 rounded-xl bg-amber-100 p-6">
      <p className="text-ink-900">{pending.what}</p>
      <p className="reflective mt-2 text-ink-700">
        {pending.eligible_now
          ? 'This is ready to take effect.'
          : `This takes effect in ${pending.time_remaining}. Protection stays on until then.`}
      </p>
      <Button
        tone="quiet"
        className="mt-4 -ml-2"
        onClick={async () => {
          await cancelPendingChange(pending.id);
          onCancelled?.();
        }}
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
