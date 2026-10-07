/**
 * How a count is read and written in the four views of Over time (slice `first-counted`, plan scenarios 37 to 39).
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module. The zone is fixed before any
 * date is made, and every expected string is made through the same calls the screen makes.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { MovementRow, Patterns, TodaysReaches } from '../../ipc/reaches';
import { weekOfInWords } from '../../localDays';
import { Reaches, type ReachesReader } from '../Reaches';

/** Friday 2 October 2026, 20:00 in London. */
const NOW = new Date(2026, 9, 2, 20, 0);

const quietDay: TodaysReaches = { reaches: [], gaps: [], coverage_note: null, sealed: null };

const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'a.example', count: 5 },
    { domain: 'b.example', count: 1 },
  ],
  by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 14 ? 5 : hour === 9 ? 1 : 0 })),
  by_weekday: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: weekday === 0 ? 5 : weekday === 1 ? 1 : 0,
    days: weekday === 6 ? 0 : 4,
  })),
  movement: [
    { day: '2025-11-03', days: 7, span: 'week', count: 5, seen: 'whole', so_far: false },
    { day: '2025-11-10', days: 7, span: 'week', count: 1, seen: 'whole', so_far: false },
    { day: '2025-11-17', days: 7, span: 'week', count: 0, seen: 'none', so_far: false },
  ] as MovementRow[],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

async function open(answer: Patterns, choice: string) {
  const read: ReachesReader = {
    listTodaysReaches: async () => quietDay,
    summarizeReaches: async () => answer,
  };
  const user = userEvent.setup();
  render(<Reaches read={read} now={() => NOW} firstDay={0} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  await user.click(await screen.findByRole('button', { name: choice }));
  const pages = () => Array.from(document.querySelectorAll('.nb-page'));
  return pages()[1] as HTMLElement;
}

const counts = (page: HTMLElement) =>
  Array.from(page.querySelectorAll<HTMLElement>('.nb-reaches-count'));

describe('a count is read with its unit (scenario 37)', () => {
  it.each(['By site', 'By hour', 'By day', 'Day by day'])(
    'in %s every count is its number then a hidden reach or reaches',
    async (choice) => {
      const page = await open(patterns(), choice);
      const found = counts(page);
      expect(found.length).toBeGreaterThan(0);
      for (const one of found) {
        const number = one.firstChild!.textContent!;
        const unit = one.querySelector('.sr-only');
        expect(unit).not.toBeNull();
        expect(one.textContent).toBe(`${number}${unit!.textContent}`);
        expect(unit!.textContent).toBe(number === '1' ? ' reach' : ' reaches');
      }
    },
  );

  it('names the week and the count as two things, so 2025 does not run into 5', async () => {
    const page = await open(patterns(), 'Day by day');
    const first = within(page).getAllByRole('listitem')[0]!;
    const name = first.querySelector('.nb-reaches-site')!;
    const count = first.querySelector('.nb-reaches-count')!;
    expect(name.textContent).toBe(weekOfInWords('2025-11-03', true));
    expect(name.contains(count)).toBe(false);
    expect(count.textContent).toBe('5 reaches');
  });

  it('gives a row that is not seen neither a count nor a unit', async () => {
    const page = await open(patterns(), 'Day by day');
    const last = within(page).getAllByRole('listitem')[2]!;
    expect(last.querySelector('.nb-reaches-count')).toBeNull();
    expect(last.textContent).not.toMatch(/reach/);
  });

  it('gives a day of the week the range does not hold neither a count nor a unit', async () => {
    const page = await open(patterns(), 'By day');
    const sunday = within(page).getAllByRole('listitem').at(-1)!;
    expect(sunday.querySelector('.nb-reaches-count')).toBeNull();
    expect(sunday.textContent).not.toMatch(/reach/);
  });
});

const grouped = (n: number) => n.toLocaleString();

describe('a count is written in the computer\'s own grouping (scenario 38)', () => {
  it('shows 1 234 as the computer groups it, and its bar is still full', async () => {
    const page = await open(
      patterns({ by_site: [{ domain: 'big.example', count: 1234 }] }),
      'By site',
    );
    const count = counts(page)[0]!;
    expect(count.firstChild?.textContent).toBe(grouped(1234));
    expect(within(page).getByTestId('bar').style.width).toBe('100%');
  });

  it('scales a bar by the number, not by the text', async () => {
    const page = await open(
      patterns({
        by_site: [
          { domain: 'big.example', count: 1234 },
          { domain: 'half.example', count: 617 },
        ],
      }),
      'By site',
    );
    const widths = within(page).getAllByTestId('bar').map((bar) => bar.style.width);
    expect(widths).toEqual(['100%', '50%']);
  });
});

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const sheet = readFileSync('src/styles/tonight-page.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const bodyOf = (selector: string): string =>
  Array.from(sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter((m) => m[1]!.split(',').some((one) => one.trim() === selector))
    .map((m) => m[2]!)
    .join('');

describe('every count in a view takes one width (scenario 39)', () => {
  it('sets the list to the length of the largest count, grouped', async () => {
    const page = await open(
      patterns({
        by_site: [
          { domain: 'a.example', count: 1234 },
          { domain: 'b.example', count: 56 },
          { domain: 'c.example', count: 7 },
        ],
      }),
      'By site',
    );
    const list = within(page).getByRole('list');
    expect(list.style.getPropertyValue('--nb-count-chars')).toBe(String(grouped(1234).length));
    expect(counts(page)).toHaveLength(3);
  });

  it('takes the width from the sheet, with tabular numerals kept', () => {
    expect(bodyOf('.nb-reaches-count')).toMatch(
      /min-width:\s*calc\(var\(--nb-count-chars, 2\) \* 1ch\)/,
    );
    expect(bodyOf('.nb-reaches-count')).toMatch(
      /font-variant-numeric:\s*tabular-nums/,
    );
  });
});

describe('a long name widens its column for every row, never runs into its bar (N28)', () => {
  it('marks the Over time list as the one whose rows share columns', async () => {
    const page = await open(
      patterns({ by_site: [{ domain: 'a.example', count: 1234 }] }),
      'By site',
    );
    expect(within(page).getByRole('list')).toHaveClass('nb-reaches-log--bars');
  });

  it('gives the name a column no narrower than the longest name, and the bars what is left', () => {
    const list = bodyOf('.nb-reaches-log--bars');
    expect(list).toMatch(/display:\s*grid/);
    expect(list).toMatch(
      /grid-template-columns:\s*minmax\(min-content, 1fr\) minmax\(0, 28%\) auto/,
    );
    const row = bodyOf('.nb-reaches-log--bars > .nb-reaches-line');
    expect(row).toMatch(/grid-template-columns:\s*subgrid/);
    expect(row).toMatch(/grid-column:\s*1 \/ -1/);
  });

  it('lays rows out only where a row can share its list\'s columns, and as before where it cannot', () => {
    expect(
      readFileSync('src/styles/tonight-page.css', 'utf8'),
    ).toMatch(/@supports \(grid-template-columns: subgrid\)\s*\{\s*\.nb-reaches-log--bars\s*\{/);
  });
});
