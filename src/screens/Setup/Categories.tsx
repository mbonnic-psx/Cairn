/**
 * Choosing what to protect.
 *
 * The nine categories, named for what a person recognises rather than for any
 * mechanism (FR-001, FR-051). Turning one on protects more and happens at once.
 * Turning one off protects less, and Cairn says plainly that it waits.
 */
import { Card } from '../../components/Card';
import type { CategoryPreset } from '../../ipc';

export function Categories({
  categories,
  onToggle,
  note,
}: {
  categories: CategoryPreset[];
  onToggle: (id: CategoryPreset['id'], on: boolean) => void;
  note?: string;
}) {
  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">What would you like to protect?</h2>
      <p className="reflective mt-3 max-w-prose text-lg text-ink-700">
        Each of these is a starting list. It becomes yours — add to it, take things out
        of it, whenever you like.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <li key={category.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-200 p-4 transition-colors duration-200 hover:bg-sand-100">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-moss-600"
                checked={category.enabled}
                onChange={(event) => onToggle(category.id, event.target.checked)}
              />
              <span>
                <span className="block text-ink-900">{category.label}</span>
                <span className="mt-0.5 block text-sm text-ink-400">
                  {category.entry_count} addresses
                  {category.edited ? ' · edited by you' : ''}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {note && <p className="mt-6 text-ink-500">{note}</p>}
    </Card>
  );
}
