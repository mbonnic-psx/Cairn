/**
 * What Cairn covers, and what it does not.
 *
 * Principle III as a screen. FR-009a in particular: an application that looks
 * up addresses on its own is not covered in this release, and that is named
 * here rather than left for someone to discover.
 */
import { Card } from '../components/Card';
import type { Disclosures } from '../ipc';

export function Limits({ disclosures }: { disclosures: Disclosures }) {
  return (
    <Card className="max-w-2xl">
      <h2 className="reflective text-3xl text-ink-900">What Cairn covers</h2>

      <ul className="mt-6 space-y-3 text-ink-700">
        {disclosures.in_force.map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase">
        What it does not cover in this release
      </h3>
      <ul className="mt-3 space-y-3 text-ink-700">
        {disclosures.not_covered.map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-300" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase">
        What is kept, and how
      </h3>
      <p className="reflective mt-3 text-ink-700">{disclosures.encryption}</p>

      <p className="reflective mt-8 border-t border-sand-200 pt-6 text-ink-500">
        {disclosures.administrator}
      </p>
    </Card>
  );
}
