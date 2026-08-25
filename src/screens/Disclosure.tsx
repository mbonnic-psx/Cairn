/**
 * What Cairn is about to do to this machine, before it does any of it.
 *
 * FR-016 and Principle III: the hosts file is machine-wide, and the background
 * component is machine-wide, so this is disclosed plainly and confirmed
 * explicitly before the first system change. Not a licence agreement — a short,
 * readable account of what changes, and how it comes back.
 */
import { useEffect, useState } from 'react';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getDisclosures, type Disclosures } from '../ipc';

export function Disclosure({
  onConfirm,
  onBack,
  disclosures,
}: {
  onConfirm: () => void;
  onBack: () => void;
  disclosures?: Disclosures;
}) {
  const [details, setDetails] = useState<Disclosures | undefined>(disclosures);

  useEffect(() => {
    if (disclosures) return;
    getDisclosures().then(setDetails).catch(() => setDetails(undefined));
  }, [disclosures]);

  return (
    <Card className="max-w-2xl">
      <h2 className="reflective text-3xl text-ink-900">Before Cairn changes anything</h2>

      <p className="reflective mt-4 text-lg text-ink-700">
        Cairn protects this whole machine, so the changes it makes affect everyone who
        uses it. It writes only inside its own marked section, and it keeps a copy of
        what was there first.
      </p>

      {details && (
        <>
          <ul className="mt-8 space-y-3 text-ink-700">
            {details.in_force.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-ink-700">{details.helper}</p>

          <h3 className="mt-8 text-sm font-medium tracking-wide text-ink-400 uppercase">
            What this does not cover
          </h3>
          <ul className="mt-3 space-y-3 text-ink-700">
            {details.not_covered.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-300" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p className="reflective mt-8 border-t border-sand-200 pt-6 text-ink-500">
            {details.administrator}
          </p>
        </>
      )}

      <div className="mt-10 flex items-center gap-3">
        <Button onClick={onConfirm}>Yes, set this up</Button>
        <Button tone="quiet" onClick={onBack}>
          Not yet
        </Button>
      </div>
    </Card>
  );
}
