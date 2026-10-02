/**
 * Protection, at a glance.
 *
 * The state shown here comes from a read-back of the machine, never from a
 * write that returned success — and `not_verified` is its own state with its
 * own words, never rendered as protected (FR-011, FR-012).
 */
import { useEffect, useState, type ReactNode } from 'react';

import {
  cancelPendingChange,
  getProtectionState,
  protectionWords,
  type PendingChange,
  type ProtectionState,
} from '../ipc';

/** The same three tones on the paper: the pill's fill and words come from the look's tokens, not the palette. */
const badgeTone = {
  moss: 'nb-protection-badge--moss',
  amber: 'nb-protection-badge--amber',
  quiet: 'nb-protection-badge--quiet',
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
      <Spread>
        <p className="nb-protection-detail">{trouble}</p>
      </Spread>
    );
  }

  if (!current) {
    return (
      <Spread>
        <p className="nb-protection-detail">Checking this machine…</p>
      </Spread>
    );
  }

  const words = protectionWords[current.status];

  return (
    <Spread right={pending && <Waiting pending={pending} onCancelled={onCancelled} />}>
      <span className={`nb-protection-badge ${badgeTone[words.tone]}`}>{words.title}</span>
      <h2 className="nb-protection-title">{words.title}</h2>
      <p className="nb-protection-detail">{words.detail}</p>
      {current.status !== 'off' && (
        <dl className="nb-protection-figures">
          <div className="nb-protection-figure">
            <dt className="nb-protection-figure__label">Addresses in force</dt>
            <dd className="nb-protection-figure__value">{current.entry_count_verified}</dd>
          </div>
          <div className="nb-protection-figure">
            <dt className="nb-protection-figure__label">Last checked</dt>
            <dd className="nb-protection-figure__value">
              {current.verified_at ? whenWas(current.verified_at) : 'not yet'}
            </dd>
          </div>
        </dl>
      )}
    </Spread>
  );
}

/** The notebook's two pages: what is said on the left, a blank ruled page (or a note) on the right. */
function Spread({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="nb-spread nb-protection-leaves">
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
  const sentence = pending.eligible_now
    ? 'This is ready to take effect.'
    : `This takes effect in ${pending.time_remaining}. Until then, nothing changes.`;
  const cancel = async () => {
    await cancelPendingChange(pending.id);
    onCancelled?.();
  };

  return (
    <div className="nb-protection-note">
      <p className="nb-protection-note__what">{pending.what}</p>
      <p className="nb-protection-note__sentence">{sentence}</p>
      {/* A plain button: nothing a look re-points fades, so none of the shared button's transition is carried here. */}
      <button type="button" className="nb-protection-note__button" onClick={cancel}>
        Keep things as they are
      </button>
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
