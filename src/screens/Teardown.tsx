/**
 * After teardown: what Cairn checked, and what is left.
 *
 * This screen reports rather than congratulates (FR-044). If something could
 * not be removed it is named here, with enough detail to act on — Cairn does
 * not round residue down to success, and it does not celebrate an outcome it
 * has not verified.
 */
import type { TeardownReport } from '../ipc';

/** Today's words, kept as constants. */
const COMPLETE_HEADING = 'This machine is as it was';
const PARTIAL_HEADING = 'Almost everything is undone';
const COMPLETE_SENTENCE =
  'Cairn checked each change it had made and undid it. What Cairn did not write is untouched.';
const PARTIAL_SENTENCE =
  'Cairn undid what it could and checked each one. These are still here, so you can decide what to do with them.';
const STILL_HERE_LABEL = 'Still here';

export function Teardown({ report }: { report: TeardownReport }) {
  return (
    <div className="nb-spread nb-teardown-leaves">
      <div className="nb-page">
        <h2 className="nb-teardown-title">
          {report.complete ? COMPLETE_HEADING : PARTIAL_HEADING}
        </h2>
        <p className="nb-teardown-sentence">
          {report.complete ? COMPLETE_SENTENCE : PARTIAL_SENTENCE}
        </p>

        {report.confirmed.length > 0 && (
          <ul className="nb-teardown-list nb-teardown-checked">
            {report.confirmed.map((line) => (
              <li key={line} className="nb-teardown-line">
                <span aria-hidden className="nb-teardown-mark nb-teardown-mark--dot" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        {report.residue.length > 0 && (
          <>
            <h3 className="nb-label nb-teardown-label">{STILL_HERE_LABEL}</h3>
            <ul className="nb-teardown-list nb-teardown-residue">
              {report.residue.map((line) => (
                <li key={line} className="nb-teardown-line">
                  <span
                    aria-hidden
                    className="nb-teardown-mark nb-teardown-mark--amber"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="nb-page nb-page--ruled" />
    </div>
  );
}
