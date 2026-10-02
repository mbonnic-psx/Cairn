/**
 * What Cairn covers, and what it does not.
 *
 * Principle III as a screen. FR-009a in particular: an application that looks
 * up addresses on its own is not covered in this release, and that is named
 * here rather than left for someone to discover.
 */
import type { Disclosures } from '../ipc';

/** The two section labels, kept as constants. */
const NOT_COVERED_LABEL = 'What it does not cover in this release';
const KEPT_LABEL = 'What is kept, and how';

export function Limits({ disclosures }: { disclosures: Disclosures }) {
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
