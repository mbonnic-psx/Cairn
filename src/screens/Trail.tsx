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
import { useId } from 'react';

import type { ProtectionStatus, Trail as TrailData } from '../ipc';

/** The way to this screen, named for what is verified. */
export function trailTitle(status: ProtectionStatus | undefined): string {
  return status === 'in_force' ? 'What is protected' : 'What you chose';
}

export function Trail({ trail, status }: { trail: TrailData; status?: ProtectionStatus }) {
  const inForce = status === 'in_force';
  const titleId = useId();

  return (
    <div className="nb-spread nb-trail-leaves">
      {/* It scrolls inside itself, so it is a tab stop of its own and the arrow keys reach it. */}
      <div className="nb-page nb-trail-sticky" tabIndex={0} role="region" aria-labelledby={titleId}>
        <h2 id={titleId} className="nb-trail-title">
          {inForce ? 'What you are protecting' : 'What you have chosen'}
        </h2>
        <p className="nb-trail-count">
          {trail.entries.length} addresses, across {trail.enabled_categories.length} lists
          and whatever you have added yourself.
        </p>
        {status === 'not_verified' && (
          <p className="nb-trail-note">
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
        <ul className="nb-trail-inventory">
          {trail.entries.map((entry) => (
            <li key={entry.domain} className="nb-trail-inventory__line">
              <span className="nb-trail-inventory__address">{entry.domain}</span>
              {entry.auto_www && (
                <span className="nb-trail-inventory__aside">added with its root address</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
