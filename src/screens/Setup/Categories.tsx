/**
 * Choosing what to protect.
 *
 * The nine categories, named for what a person recognises rather than for any
 * mechanism (FR-001, FR-051). Turning one on protects more and happens at once.
 * Turning one off before protection is on also happens at once — nothing is
 * protected yet, so nothing is weakened. Once something is in force it waits,
 * and Cairn says so plainly.
 */
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
    <section className="nb-categories-section">
      <h2 className="nb-categories-title">What would you like to protect?</h2>
      <p className="nb-categories-lead">
        Each of these is a starting list. It becomes yours — add to it, take things out
        of it, whenever you like.
      </p>

      <ul className="nb-categories-list">
        {categories.map((category) => (
          <li key={category.id}>
            <label className="nb-categories-row">
              <input
                type="checkbox"
                className="nb-categories-box"
                checked={category.enabled}
                onChange={(event) => onToggle(category.id, event.target.checked)}
              />
              <span>
                <span className="nb-categories-name">{category.label}</span>
                <span className="nb-categories-count">
                  {category.entry_count} addresses
                  {category.edited ? ' · edited by you' : ''}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {note && <p className="nb-categories-note">{note}</p>}
    </section>
  );
}
