/**
 * Everything that is protected, and where each entry came from.
 *
 * Reviewing is free. Removing is not: taking something out protects you less,
 * so it goes through the waiting period, and this screen says so rather than
 * offering a button that would do it now (FR-046, FR-047).
 */
import { Card } from '../components/Card';
import type { Trail as TrailData } from '../ipc';

export function Trail({ trail }: { trail: TrailData }) {
  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">What you are protecting</h2>
      <p className="reflective mt-3 max-w-prose text-lg text-ink-700">
        {trail.entries.length} addresses, across {trail.enabled_categories.length} lists
        and whatever you have added yourself.
      </p>

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
