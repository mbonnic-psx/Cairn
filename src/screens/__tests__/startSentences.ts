/**
 * What a sentence that names when Cairn started counting must never say (slice `first-counted`, plan *The words*,
 * *What it never says*; rule 16, scenario 40). One scan for the sentences of Over time, Today and the check-in.
 */
import { expect } from 'vitest';

/** The words the voice forbids anywhere (SC-013). */
const BANNED = /\b(failed|fail|denied|violation|relapsed|relapse|forbidden|you lost)\b/i;
/** A day counted from the start, a number of days since it, or a streak. */
const COUNTED_DAYS = /\bday\s*\d|\b\d+\s*days?\b|since\s+\d|\bstreak\b|\bin a row\b/i;
/** What the start never says: it is not a first, not new, not a welcome, not a congratulation. */
const NEVER = /\b(first day|only|already|welcome|new|congratulations?|well done|great|keep it up|so far)\b/i;
/** A control that changes protection. */
const CONTROLS = /\b(turn|switch|pause|stop|unblock|allow)\b/i;

export function expectStartVoice(sentence: string): void {
  expect(sentence).not.toMatch(BANNED);
  expect(sentence).not.toMatch(COUNTED_DAYS);
  expect(sentence).not.toMatch(NEVER);
  expect(sentence).not.toMatch(CONTROLS);
}

/** Every element whose own text begins the start sentence, so a test can hold their number and their words. */
export const startSentences = (root: ParentNode = document.body): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('p')).filter((p) =>
    (p.textContent ?? '').startsWith('Cairn started counting'),
  );
