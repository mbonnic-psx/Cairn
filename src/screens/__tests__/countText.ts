/**
 * What a row shows, apart from the hidden unit a count carries for a screen reader (slice `first-counted`, rule 13).
 * The tests that hold what a line shows read it through these, so the unit is held in one place
 * (`ReachesCounts.test.tsx`) and not re-asserted on every line.
 */

/** The text of `el` as seen: the visually hidden parts left out. */
export function shown(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('.sr-only').forEach((hidden) => hidden.remove());
  return copy.textContent ?? '';
}

/** The leaves of a line's markup in order; a count is one leaf, its number. */
export const leavesOf = (line: Element): string[] =>
  Array.from(line.querySelectorAll('*'))
    .filter(
      (el) =>
        !el.classList.contains('sr-only') &&
        (el.children.length === 0 || el.classList.contains('nb-reaches-count')) &&
        shown(el),
    )
    .map(shown);
