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

export function Teardown({ report }: { report: TeardownReport }) {
  return (
    <Card className="max-w-2xl">
      <h2 className="reflective text-3xl text-ink-900">
        {report.complete ? 'This machine is as it was' : 'Almost everything is undone'}
      </h2>

      <p className="reflective mt-4 text-lg text-ink-700">
        {report.complete
          ? 'Cairn checked each change it had made and undid it. What Cairn did not write is untouched.'
          : 'Cairn undid what it could and checked each one. These are still here, so you can decide what to do with them.'}
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
            Still here
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
