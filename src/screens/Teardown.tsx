/**
 * After teardown: what Cairn checked, and what is left.
 *
 * This screen reports rather than congratulates (FR-044). If something could
 * not be removed it is named here, with enough detail to act on — Cairn does
 * not round residue down to success, and it does not celebrate an outcome it
 * has not verified.
 */
import { Card } from '../components/Card';
import type { TeardownReport } from '../ipc';
import { useNotebookPage } from '../shell/notebookPage';

/** Today's words, read by both layouts so they cannot drift apart. */
const COMPLETE_HEADING = 'This machine is as it was';
const PARTIAL_HEADING = 'Almost everything is undone';
const COMPLETE_SENTENCE =
  'Cairn checked each change it had made and undid it. What Cairn did not write is untouched.';
const PARTIAL_SENTENCE =
  'Cairn undid what it could and checked each one. These are still here, so you can decide what to do with them.';
const STILL_HERE_LABEL = 'Still here';

export function Teardown({ report }: { report: TeardownReport }) {
  const onPage = useNotebookPage();

  if (onPage) {
    return (
      <div className="nb-spread nb-teardown-leaves">
        <div className="nb-page">
          <h2 className="nb-teardown-title">{report.complete ? COMPLETE_HEADING : PARTIAL_HEADING}</h2>
          <p className="nb-teardown-sentence">{report.complete ? COMPLETE_SENTENCE : PARTIAL_SENTENCE}</p>

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
                    <span aria-hidden className="nb-teardown-mark nb-teardown-mark--amber" />
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

  return (
    <Card className="max-w-2xl">
      <h2 className="reflective text-3xl text-ink-900">
        {report.complete ? COMPLETE_HEADING : PARTIAL_HEADING}
      </h2>

      <p className="reflective mt-4 text-lg text-ink-700">
        {report.complete ? COMPLETE_SENTENCE : PARTIAL_SENTENCE}
      </p>

      {report.confirmed.length > 0 && (
        <ul className="mt-8 space-y-3 text-ink-700">
          {report.confirmed.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {report.residue.length > 0 && (
        <>
          <h3 className="mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase">
            {STILL_HERE_LABEL}
          </h3>
          <ul className="mt-3 space-y-3 text-ink-700">
            {report.residue.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
