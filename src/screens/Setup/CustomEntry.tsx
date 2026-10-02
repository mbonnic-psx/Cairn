/**
 * Adding an address by hand.
 *
 * One at a time, typed however it comes to mind — with a scheme, a port, a
 * path, in capitals. Cairn stores one form of it and says what it stored
 * (FR-003, FR-004).
 *
 * When an address cannot be taken, the sentence that comes back is shown
 * exactly as written. It says what to try instead, and it never suggests the
 * person did something wrong (FR-050).
 *
 * Adding an address puts it on the list; it does not, by itself, block it.
 * So after adding, the screen reads the machine back and says "Protected" only
 * when that read-back shows protection in force. Before protection is on, or
 * when the machine could not be checked, it says the address was added —
 * never that it is protected (Principle III).
 */
import { useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import {
  addCustomEntry,
  getProtectionState,
  type ProtectionState,
  type ProtectionStatus,
  type Rejection,
} from '../../ipc';
import { useNotebookPage } from '../../shell/notebookPage';

export function CustomEntry({
  onAdded,
  add = addCustomEntry,
  check = getProtectionState,
}: {
  onAdded?: (domains: string[]) => void;
  add?: (input: string) => Promise<string[]>;
  /** Reads the machine back after an address is added. */
  check?: () => Promise<ProtectionState>;
}) {
  const [input, setInput] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [status, setStatus] = useState<ProtectionStatus>('not_verified');
  const [reason, setReason] = useState<string>();
  const onPage = useNotebookPage();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;

    try {
      const domains = await add(input);
      setStatus(await verifiedStatus(check));
      setAdded(domains);
      setReason(undefined);
      setInput('');
      onAdded?.(domains);
    } catch (problem) {
      setReason(reasonFrom(problem));
      setAdded([]);
    }
  }

  if (onPage) {
    return (
      <section className="nb-custom-section">
        <h2 className="nb-custom-title">Anywhere else?</h2>
        <p className="nb-custom-lead">
          Type an address and Cairn will protect it, along with its www. form.
        </p>

        <form onSubmit={submit} className="nb-custom-form">
          <label className="sr-only" htmlFor="address">
            Address to protect
          </label>
          <input
            id="address"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="example.com"
            className="nb-custom-input"
          />
          <button type="submit" className="nb-custom-button" disabled={!input.trim()}>
            Protect it
          </button>
        </form>

        {added.length > 0 && <p className="nb-custom-added">{addedSentence(status, added)}</p>}

        {reason && (
          <p role="status" className="nb-custom-reason">
            {reason}
          </p>
        )}
      </section>
    );
  }

  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">Anywhere else?</h2>
      <p className="reflective mt-3 max-w-prose text-lg text-ink-700">
        Type an address and Cairn will protect it, along with its www. form.
      </p>

      <form onSubmit={submit} className="mt-8 flex gap-3">
        <label className="sr-only" htmlFor="address">
          Address to protect
        </label>
        <input
          id="address"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="example.com"
          className="flex-1 rounded-lg border border-sand-300 bg-white/70 px-4 py-2.5 text-ink-900 placeholder:text-ink-400 focus:border-clay-500 focus:outline-none"
        />
        <Button type="submit" disabled={!input.trim()}>
          Protect it
        </Button>
      </form>

      {added.length > 0 && (
        <p className="mt-4 text-moss-600">
          {addedSentence(status, added)}
        </p>
      )}

      {reason && (
        <p role="status" className="mt-4 text-amber-600">
          {reason}
        </p>
      )}
    </Card>
  );
}

/** What the machine shows now. A read-back that does not come back is not confirmation. */
async function verifiedStatus(check: () => Promise<ProtectionState>): Promise<ProtectionStatus> {
  try {
    return (await check()).status;
  } catch {
    return 'not_verified';
  }
}

/** "Protected" only from a read-back that shows it in force. */
function addedSentence(status: ProtectionStatus, domains: string[]): string {
  const list = domains.join(', ');
  switch (status) {
    case 'in_force':
      return `Protected: ${list}`;
    case 'off':
      return `Added — Cairn will protect these once protection is on: ${list}`;
    case 'not_verified':
      return `Added to your list, though Cairn has not confirmed it is in force just now: ${list}`;
  }
}

/** A rejection carries its own sentence; anything else gets a plain one. */
function reasonFrom(problem: unknown): string {
  if (typeof problem === 'string') return problem;
  if (problem && typeof problem === 'object' && 'reason' in problem) {
    return String((problem as Rejection).reason);
  }
  return 'Cairn could not add that just now. Nothing has changed.';
}
