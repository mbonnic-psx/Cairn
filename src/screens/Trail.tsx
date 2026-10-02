/**
 * Everything that was chosen, and where each entry came from.
 *
 * Reviewing is free. Removing is not: taking something out protects you less,
 * so it goes through the waiting period, and this screen says so rather than
 * offering a button that would do it now (FR-046, FR-047).
 *
 * The list is what the person chose. It is called protected only while the
 * machine shows it in force (Principle III).
 */
import { Card } from '../components/Card';
import { useNotebookPage } from '../shell/notebookPage';
import type { ProtectionStatus, Trail as TrailData } from '../ipc';

/** The way to this screen, named for what is verified. */
export function trailTitle(status: ProtectionStatus | undefined): string {
  return status === 'in_force' ? 'What is protected' : 'What you chose';
}

export function Trail({ trail, status }: { trail: TrailData; status?: ProtectionStatus }) {
  const inForce = status === 'in_force';
  const onPage = useNotebookPage();

  if (onPage) {
    return (
      <div className="nb-spread">
        <div className="nb-page nb-page--sticky">
          <h2 className="nb-trail-title">
            {inForce ? 'What you are protecting' : 'What you have chosen'}
          </h2>
          <p className="nb-trail-count">
            {trail.entries.length} addresses, across {trail.enabled_categories.length} lists
            and whatever you have added yourself.
          </p>
          {status === 'not_verified' && (
            <p className="nb-note">
              Cairn has not confirmed this is in force just now. It keeps trying, and it keeps
              what you chose.
            </p>
          )}
          <p className="nb-trail-taking-out">
            Taking something out protects you less, so it waits a day before it takes
            effect. You can ask for that here, and cancel it at any time in that day.
          </p>
        </div>
        <div className="nb-page nb-page--ruled">
          <ul className="nb-inventory">
            {trail.entries.map((entry) => (
              <li key={entry.domain} className="nb-inventory__line">
                <span className="nb-inventory__address">{entry.domain}</span>
                {entry.auto_www && (
                  <span className="nb-inventory__aside">added with its root address</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">
        {inForce ? 'What you are protecting' : 'What you have chosen'}
      </h2>
      <p className="reflective mt-3 max-w-prose text-lg text-ink-700">
        {trail.entries.length} addresses, across {trail.enabled_categories.length} lists
        and whatever you have added yourself.
      </p>
      {status === 'not_verified' && (
        <p className="mt-3 max-w-prose text-amber-600">
          Cairn has not confirmed this is in force just now. It keeps trying, and it keeps
          what you chose.
        </p>
      )}

      <ul className="mt-8 divide-y divide-sand-200">
        {trail.entries.map((entry) => (
          <li key={entry.domain} className="flex items-baseline justify-between py-3">
            <span className="text-ink-900">{entry.domain}</span>
            {entry.auto_www && (
              <span className="text-sm text-ink-400">added with its root address</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-8 border-t border-sand-200 pt-6 text-ink-500">
        Taking something out protects you less, so it waits a day before it takes
        effect. You can ask for that here, and cancel it at any time in that day.
      </p>
    </Card>
  );
}
