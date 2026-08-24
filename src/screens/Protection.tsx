/**
 * Protection, at a glance.
 *
 * The state shown here comes from a read-back of the machine, never from a
 * write that returned success — and `not_verified` is its own state with its
 * own words, never rendered as protected (FR-011, FR-012).
 */
import { useEffect, useState } from 'react';

import { Card } from '../components/Card';
import {
  getProtectionState,
  protectionWords,
  type ProtectionState,
} from '../ipc';

const toneClasses = {
  moss: 'bg-moss-100 text-moss-600',
  amber: 'bg-amber-100 text-amber-600',
  quiet: 'bg-sand-100 text-ink-500',
} as const;

export function Protection({ state }: { state?: ProtectionState }) {
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

/** Rough, human, and never a countdown. */
function whenWas(seconds: number): string {
  const ago = Math.max(0, Math.round(Date.now() / 1000 - seconds));
  if (ago < 90) return 'just now';
  if (ago < 3600) return `${Math.round(ago / 60)} minutes ago`;
  if (ago < 86400) return `${Math.round(ago / 3600)} hours ago`;
  return `${Math.round(ago / 86400)} days ago`;
}
