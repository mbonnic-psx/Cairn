/**
 * What Cairn covers, and what it does not.
 *
 * Principle III as a screen. FR-009a in particular: an application that looks
 * up addresses on its own is not covered in this release, and that is named
 * here rather than left for someone to discover.
 */
import { Card } from '../components/Card';
import type { Disclosures } from '../ipc';
import { useNotebookPage } from '../shell/notebookPage';

/** The two section labels, read by both layouts so their words cannot drift apart. */
const NOT_COVERED_LABEL = 'What it does not cover in this release';
const KEPT_LABEL = 'What is kept, and how';

export function Limits({ disclosures }: { disclosures: Disclosures }) {
  const onPage = useNotebookPage();

  if (onPage) {
    return (
      <div className="nb-spread nb-limits-leaves">
        <div className="nb-page">
          <h2 className="nb-limits-title">What Cairn covers</h2>

          <ul className="nb-limits-list">
            {disclosures.in_force.map((line) => (
              <li key={line} className="nb-limits-line">
                <span aria-hidden className="nb-limits-mark nb-limits-mark--dot" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <h3 className="nb-label nb-limits-label">{NOT_COVERED_LABEL}</h3>
          <ul className="nb-limits-list">
            {disclosures.not_covered.map((line) => (
              <li key={line} className="nb-limits-line">
                <span aria-hidden className="nb-limits-mark nb-limits-mark--ring" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <h3 className="nb-label nb-limits-label">{KEPT_LABEL}</h3>
          <p className="nb-limits-kept">{disclosures.encryption}</p>

          <p className="nb-limits-note">{disclosures.administrator}</p>
        </div>
        <div className="nb-page nb-page--ruled" />
      </div>
    );
  }

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
        {NOT_COVERED_LABEL}
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
        {KEPT_LABEL}
      </h3>
      <p className="reflective mt-3 text-ink-700">{disclosures.encryption}</p>

      <p className="reflective mt-8 border-t border-sand-200 pt-6 text-ink-500">
        {disclosures.administrator}
      </p>
    </Card>
  );
}
