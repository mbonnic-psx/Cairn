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
 */
import { useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { addCustomEntry, type Rejection } from '../../ipc';

export function CustomEntry({
  onAdded,
  add = addCustomEntry,
}: {
  onAdded?: (domains: string[]) => void;
  add?: (input: string) => Promise<string[]>;
}) {
  const [input, setInput] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [reason, setReason] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;

    try {
      const domains = await add(input);
      setAdded(domains);
      setReason(undefined);
      setInput('');
      onAdded?.(domains);
    } catch (problem) {
      setReason(reasonFrom(problem));
      setAdded([]);
    }
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
          Protected: {added.join(', ')}
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

/** A rejection carries its own sentence; anything else gets a plain one. */
function reasonFrom(problem: unknown): string {
  if (typeof problem === 'string') return problem;
  if (problem && typeof problem === 'object' && 'reason' in problem) {
    return String((problem as Rejection).reason);
  }
  return 'Cairn could not add that just now. Nothing has changed.';
}
