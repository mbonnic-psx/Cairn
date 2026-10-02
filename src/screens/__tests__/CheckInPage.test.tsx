/**
 * Tonight (`CheckIn`) told it is on a notebook page (slice `tonight-page`): the same words as outside any
 * shell, laid out as a spread. The core is the IPC fake and the clock is Vitest's fake timers, as the pin does.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotebookLook } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { CheckIn, type CheckInSession } from '../CheckIn';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import {
  dayCoverageNote,
  evening,
  lateEvening,
  loadRefusal,
  quoteLine,
  saveRefusal,
  switchRefusal,
  reachesOfTheDay,
  tonightCases,
  tonightCore,
  type TonightCase,
} from './tonightCases';

const tabs = [{ id: 'reaches' as const, label: 'Tonight', current: true }];

/** The look the cases below run in: every case runs in all three. */
let look: NotebookLook = 'morning';
let core: FakeCore | undefined;

/** Lets every answer the fake core has given reach the screen. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

/** Renders a case, on a page when `shell` is true, and does what the person does in it. */
async function show(
  c: TonightCase,
  shell: boolean,
  perform = false,
  typed?: string,
) {
  vi.setSystemTime(c.endsWhileOpen ? lateEvening() : evening());
  core = installFakeCore(tonightCore(c));
  const ui = <CheckIn />;
  const view = render(
    shell ? (
      <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
        {ui}
      </NotebookShell>
    ) : (
      ui
    ),
  );
  await settle();
  if (perform && c.keep) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: c.keep.typed } });
    fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
    await settle();
  }
  if (perform && c.switchRefused) {
    fireEvent.click(screen.getByRole('button', { name: 'Hide quotes' }));
    await settle();
  }
  if (typed !== undefined) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: typed } });
  }
  if (c.endsWhileOpen) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    });
  }
  const main = (view.container.querySelector('main') ?? view.container) as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread');
  const pages = spread
    ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'))
    : [];
  return { ...view, main, spread, left: pages[0], right: pages[1], pages };
}

/** The text of every element with no element inside it, sorted: the words, wherever they sit. */
function words(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string)
    .sort();
}

async function wordsOutside(
  c: TonightCase,
  perform = false,
  typed?: string,
): Promise<string[]> {
  const view = await show(c, false, perform, typed);
  const found = words(view.container);
  view.unmount();
  core?.remove();
  return found;
}

/** The time as Current writes it: the same call. */
const timeOf = (seconds: number) =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** What an open day's right page says in the cases of the left page's tests, with quotes hidden. */
const RIGHT_WORDS = ['How the day went', 'Keep this', 'Show quotes'];

const withoutRight = (found: string[]) => {
  const rest = [...found];
  for (const word of RIGHT_WORDS) rest.splice(rest.indexOf(word), 1);
  return rest;
};

/** The words in `found` that `taken` does not account for (a multiset difference). */
function without(found: string[], taken: string[]) {
  const rest = [...found];
  for (const word of taken) rest.splice(rest.indexOf(word), 1);
  return rest;
}

const OPEN_DAYS = [
  'reaches, no coverage note, quotes hidden',
  'no reaches, no coverage note, quotes hidden',
  'reaches, a coverage note, quotes hidden',
  'no reaches, a coverage note, quotes hidden',
];

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (name) => {
  beforeEach(() => {
    look = name;
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    core?.remove();
    core = undefined;
    vi.useRealTimers();
  });

  describe('Tonight while loading, or after a load that could not be made', () => {
    it('looking: "Looking…" and no heading on the left, a ruled empty page on the right, nothing announced', async () => {
      const { spread, left, right } = await show(tonightCases.looking!, true);
      expect(spread).toHaveClass('nb-spread', 'nb-checkin-leaves');
      expect(within(left!).getByText('Looking…')).toBeInTheDocument();
      expect(within(left!).queryByRole('heading')).toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(right!.querySelectorAll('*')).toHaveLength(0);
      expect(spread!.querySelector('[role="status"], [aria-live]')).toBeNull();
    });

    it('a load that could not be made: the core’s sentence as a plain paragraph, a ruled empty page', async () => {
      const c = tonightCases['a load that could not be made']!;
      const { spread, left, right, main } = await show(c, true);
      expect(spread).not.toBeNull();
      expect(left!.textContent).toBe(loadRefusal);
      const sentence = left!.querySelector('p')!;
      expect(sentence).toHaveTextContent(loadRefusal);
      expect(spread!.querySelector('[role="status"], [aria-live]')).toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(right!.querySelectorAll('*')).toHaveLength(0);
      expect(main.querySelector('.settle')).toBeNull();
      for (const el of Array.from(main.querySelectorAll<HTMLElement>('*'))) {
        expect(el.style.height).toBe('');
        expect(el.style.overflow).toBe('');
      }
    });

    it.each(['looking', 'a load that could not be made'])(
      '%s: the words equal the same state outside any shell, which is the Pin’s card',
      async (key) => {
        const c = tonightCases[key]!;
        const onPage = await show(c, true);
        expect(onPage.spread).not.toBeNull();
        const found = words(onPage.spread!);
        onPage.unmount();
        core?.remove();
        expect(found).toEqual(await wordsOutside(c));
        const outside = await show(c, false);
        expect(outside.container.querySelector('section.settle')).not.toBeNull();
        expect(outside.container.querySelector('[class*="nb-"]')).toBeNull();
      },
    );
  });

  describe('an open day, the left page', () => {
    it.each(OPEN_DAYS)('%s: the heading, then the log or the empty sentence, then the coverage note', async (key) => {
      const c = tonightCases[key]!;
      const { spread, left, right, main } = await show(c, true);
      expect(spread).not.toBeNull();
      const day = c.day as Exclude<TonightCase['day'], string | { refused: string }>;
      const heading = within(left!).getByRole('heading', { level: 2, name: 'Tonight' });
      expect(left!.firstElementChild).toBe(heading);
      expect(within(main).getAllByRole('heading', { level: 2 })).toEqual([heading]);
      expect(right).toHaveClass('nb-page--ruled');

      if (day.reaches.length > 0) {
        const lines = Array.from(left!.querySelectorAll('li'));
        expect(lines.map((li) => li.parentElement!.tagName)).toEqual(
          lines.map(() => 'UL'),
        );
        expect(
          lines.map((li) => Array.from(li.children).map((el) => el.textContent)),
        ).toEqual(reachesOfTheDay.map((r) => [r.domain, timeOf(r.at)]));
        for (const li of lines) {
          expect(li).toHaveClass('nb-checkin-line');
          expect(li.children[0]).toHaveClass('nb-checkin-site');
          expect(li.children[1]).toHaveClass('nb-checkin-time');
        }
        expect(left!.textContent).not.toContain('Nothing here');
      } else {
        const empty = within(left!).getByText('Nothing here for today.');
        expect(empty).toHaveClass('nb-checkin-empty');
        expect(left!.querySelector('li')).toBeNull();
      }
      if (day.coverage_note) {
        const note = within(left!).getByText(dayCoverageNote);
        expect(left!.lastElementChild).toBe(note);
        expect(note).toHaveClass('nb-checkin-note');
      } else {
        expect(left!.querySelector('.nb-checkin-note')).toBeNull();
      }
    });

    it.each(OPEN_DAYS)('%s: the left page\u2019s words equal the same part outside any shell', async (key) => {
      const c = tonightCases[key]!;
      const onPage = await show(c, true);
      expect(onPage.left).toBeDefined();
      const found = words(onPage.left!);
      onPage.unmount();
      core?.remove();
      expect(found).toEqual(withoutRight(await wordsOutside(c)));
    });

    it('outside any shell the open day is the Pin\u2019s card', async () => {
      const outside = await show(tonightCases[OPEN_DAYS[0]!]!, false);
      expect(outside.container.querySelector('section.settle')).not.toBeNull();
      expect(outside.container.querySelector('[class*="nb-"]')).toBeNull();
    });
  });

  describe('an open day, the right page: the writing space and "Keep this"', () => {
    const WRITING_DAYS = [
      ...OPEN_DAYS,
      'an entry written before',
    ];

    it.each(WRITING_DAYS)('%s: a labelled textarea of the slice\u2019s class, then "Keep this"', async (key) => {
      const { spread, right } = await show(tonightCases[key]!, true);
      expect(spread).not.toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      const space = within(right!).getByLabelText('How the day went');
      expect(space.tagName).toBe('TEXTAREA');
      expect(space).toHaveClass('nb-checkin-write');
      for (const banned of ['focus:outline-none', 'focus:border-clay-500', 'min-h-48']) {
        expect(space).not.toHaveClass(banned);
      }
      expect(Array.from(space.classList).some((c) => c.startsWith('border-'))).toBe(false);
      const keep = within(right!).getByRole('button', { name: 'Keep this' });
      expect(keep.tagName).toBe('BUTTON');
      expect(keep).toHaveClass('nb-checkin-keep');
      expect(keep.className).not.toMatch(/transition|duration-|animate-/);
      // The label comes first, the button after the writing space.
      expect(
        space.compareDocumentPosition(keep) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(right!.querySelector('label')).toHaveClass('nb-checkin-label');
    });

    it('shows the saved entry when nothing has been typed, and the typed text once there is some', async () => {
      const { right } = await show(tonightCases['an entry written before']!, true);
      const space = within(right!).getByLabelText('How the day went') as HTMLTextAreaElement;
      expect(space.value).toBe('A slow morning, a better afternoon.');
      fireEvent.change(space, { target: { value: 'Typed since.' } });
      expect(space.value).toBe('Typed since.');
    });

    it('asks the session to type what is typed, and shows the session\u2019s draft', async () => {
      const typed: string[] = [];
      const session: CheckInSession = {
        opened: { day: '2026-09-30', start: 1_790_722_800, end: 1_790_809_200 },
        open: () => undefined,
        draft: 'Held by the session.',
        note: undefined,
        kept: false,
        keeping: false,
        quote: undefined,
        holdQuote: () => undefined,
        type: (text) => typed.push(text),
        keep: () => Promise.resolve(undefined),
      };
      vi.setSystemTime(evening());
      core = installFakeCore(tonightCore(tonightCases[OPEN_DAYS[0]!]!));
      render(
        <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
          <CheckIn session={session} />
        </NotebookShell>,
      );
      await settle();
      const space = screen.getByLabelText('How the day went') as HTMLTextAreaElement;
      expect(space.value).toBe('Held by the session.');
      fireEvent.change(space, { target: { value: 'More.' } });
      expect(typed).toEqual(['More.']);
    });

    it('"Keep this" is disabled while the space shows nothing and enabled once it shows something', async () => {
      const { right } = await show(tonightCases[OPEN_DAYS[0]!]!, true);
      const keep = within(right!).getByRole('button', { name: 'Keep this' });
      const space = within(right!).getByLabelText('How the day went');
      expect(keep).toBeDisabled();
      fireEvent.change(space, { target: { value: ' \u200B ' } });
      expect(keep).toBeDisabled();
      fireEvent.change(space, { target: { value: 'Something.' } });
      expect(keep).toBeEnabled();
    });

    it('"Keep this" is disabled while keeping', async () => {
      // `save_journal_entry` never answers in this case, so the save stays out.
      const { right } = await show(tonightCases['an entry written before']!, true);
      const keep = within(right!).getByRole('button', { name: 'Keep this' });
      expect(keep).toBeEnabled();
      fireEvent.click(keep);
      await settle();
      expect(keep).toBeDisabled();
    });

    it('pressing it asks save_journal_entry with the same arguments as outside any shell', async () => {
      const c = tonightCases['an entry kept']!;
      const saves = async (shell: boolean) => {
        const view = await show(c, shell);
        fireEvent.change(screen.getByLabelText('How the day went'), {
          target: { value: c.keep!.typed },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
        await settle();
        const asked = core!.calls.filter((call) => call.cmd === 'save_journal_entry');
        view.unmount();
        core?.remove();
        return asked;
      };
      const onPage = await saves(true);
      expect(onPage).toHaveLength(1);
      expect(onPage).toEqual(await saves(false));
    });

    it.each(WRITING_DAYS)('%s: the right page\u2019s words equal the same part outside any shell', async (key) => {
      const c = tonightCases[key]!;
      const onPage = await show(c, true);
      expect(onPage.right).toBeDefined();
      const left = words(onPage.left!);
      const right = words(onPage.right!);
      onPage.unmount();
      core?.remove();
      expect(right).toEqual(without(await wordsOutside(c), left));
    });
  });

  describe('the quote and the quotes switch on an open day', () => {
    /** The class of each of the right page's direct children, in order. */
    const order = (right: HTMLElement) =>
      Array.from(right.children).map((el) => el.className);

    /** The setting still being read: `get_quotes_shown` never answers. */
    const pendingSetting: TonightCase = {
      ...tonightCases['reaches, with a quote']!,
      quotesShown: false,
    };

    it('quotes shown with a quote: the quote first, the writing space, "Keep this", the switch last', async () => {
      const { right } = await show(tonightCases['reaches, with a quote']!, true);
      expect(right).toBeDefined();
      expect(order(right!)).toEqual([
        'nb-checkin-quote',
        'nb-checkin-label',
        'nb-checkin-keep',
        'nb-checkin-status',
        'nb-checkin-switch',
      ]);
      const quote = right!.firstElementChild as HTMLElement;
      expect(quote.tagName).toBe('FIGURE');
      expect(quote.querySelector('p')).toHaveClass('nb-checkin-quote__line');
      expect(quote).toHaveTextContent(quoteLine);
      expect(right!.lastElementChild).toHaveTextContent('Hide quotes');
    });

    it('quotes hidden: no quote, the switch reads "Show quotes"', async () => {
      const { right } = await show(tonightCases[OPEN_DAYS[0]!]!, true);
      expect(right).toBeDefined();
      expect(right!.querySelector('figure')).toBeNull();
      expect(order(right!)).toEqual([
        'nb-checkin-label',
        'nb-checkin-keep',
        'nb-checkin-status',
        'nb-checkin-switch',
      ]);
      expect(right!.lastElementChild).toHaveTextContent('Show quotes');
    });

    it('the setting unknown, refused: no quote and no switch', async () => {
      const { right } = await show(tonightCases['reaches, the quotes setting unknown']!, true);
      expect(right).toBeDefined();
      expect(right!.querySelector('figure')).toBeNull();
      expect(order(right!)).toEqual(['nb-checkin-label', 'nb-checkin-keep', 'nb-checkin-status']);
    });

    it('the setting unknown, still being read: no quote and no switch', async () => {
      vi.setSystemTime(evening());
      const answers = tonightCore(pendingSetting);
      core = installFakeCore({ ...answers, get_quotes_shown: never });
      const view = render(
        <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
          <CheckIn />
        </NotebookShell>,
      );
      await settle();
      const right = view.container
        .querySelector<HTMLElement>('main .nb-spread')!
        .querySelectorAll<HTMLElement>(':scope > .nb-page')[1];
      expect(right).toBeDefined();
      expect(right!.querySelector('figure')).toBeNull();
      expect(order(right!)).toEqual(['nb-checkin-label', 'nb-checkin-keep', 'nb-checkin-status']);
    });

    it('shown with no quote: no quote, the switch present', async () => {
      const { right } = await show(tonightCases['reaches, quotes shown and none to be had']!, true);
      expect(right).toBeDefined();
      expect(right!.querySelector('figure')).toBeNull();
      expect(order(right!)).toEqual([
        'nb-checkin-label',
        'nb-checkin-keep',
        'nb-checkin-status',
        'nb-checkin-switch',
      ]);
      expect(right!.lastElementChild).toHaveTextContent('Hide quotes');
    });

    it('the switch is a plain button in the slice\u2019s class, with no fade', async () => {
      const { right } = await show(tonightCases['reaches, with a quote']!, true);
      expect(right).toBeDefined();
      const toggle = within(right!).getByRole('button', { name: 'Hide quotes' });
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle).toHaveClass('nb-checkin-switch');
      expect(toggle.className).not.toMatch(/transition|duration-|animate-|rounded|px-/);
    });

    it('pressing it asks set_quotes_shown with the same arguments as outside any shell', async () => {
      const c = tonightCases['reaches, with a quote']!;
      const presses = async (shell: boolean) => {
        const view = await show(c, shell);
        fireEvent.click(screen.getByRole('button', { name: 'Hide quotes' }));
        await settle();
        const asked = core!.calls.filter((call) => call.cmd === 'set_quotes_shown');
        view.unmount();
        core?.remove();
        return asked;
      };
      const onPage = await presses(true);
      expect(onPage).toEqual([{ cmd: 'set_quotes_shown', args: { shown: false } }]);
      expect(onPage).toEqual(await presses(false));
    });

    it.each([
      'reaches, with a quote',
      'reaches, quotes shown and none to be had',
      'reaches, the quotes setting unknown',
    ])('%s: the right page\u2019s words equal the same part outside any shell', async (key) => {
      const c = tonightCases[key]!;
      const onPage = await show(c, true);
      expect(onPage.right).toBeDefined();
      const left = words(onPage.left!);
      const right = words(onPage.right!);
      onPage.unmount();
      core?.remove();
      expect(right).toEqual(without(await wordsOutside(c), left));
    });
  });

  describe('the status sentence on an open day', () => {
    const bothRefused: TonightCase = {
      ...tonightCases['a refused save']!,
      quotesShown: true,
      quote: quoteLine,
      switchRefused: switchRefusal,
    };
    const REGION = '[role="status"], [aria-live]';

    /** The one region, and the order of the right page's controls around it. */
    function region(right: HTMLElement) {
      const found = right.querySelectorAll<HTMLElement>(REGION);
      expect(found).toHaveLength(1);
      return found[0]!;
    }

    it.each([
      ['an entry kept', 'Kept for today.'],
      ['a refused save', saveRefusal],
      ['a refused switch', switchRefusal],
      ['both refused', `${saveRefusal} ${switchRefusal}`],
      ['neither', ''],
    ])('%s: one polite region, below "Keep this" and above the switch, reading %j', async (which, text) => {
      const c =
        which === 'both refused'
          ? bothRefused
          : tonightCases[which === 'neither' ? 'reaches, with a quote' : which]!;
      const { spread, right } = await show(c, true, true);
      expect(right).toBeDefined();
      const status = region(right!);
      expect(spread!.querySelectorAll(REGION)).toHaveLength(1);
      expect(status).toHaveAttribute('role', 'status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveClass('nb-checkin-status');
      expect(status.textContent).toBe(text);
      const keep = within(right!).getByRole('button', { name: 'Keep this' });
      const toggle = within(right!).getByRole('button', { name: /quotes$/ });
      expect(keep.nextElementSibling).toBe(status);
      expect(status.nextElementSibling).toBe(toggle);
      expect(right!.lastElementChild).toBe(toggle);
    });

    it('is present, and the only live region, on a day with no switch yet', async () => {
      const { spread, right } = await show(tonightCases['reaches, the quotes setting unknown']!, true);
      expect(region(right!).textContent).toBe('');
      expect(spread!.querySelectorAll(REGION)).toHaveLength(1);
      expect(right!.lastElementChild).toBe(region(right!));
    });

    it.each([
      ['an entry kept', tonightCases['an entry kept']!],
      ['a refused save', tonightCases['a refused save']!],
      ['a refused switch', tonightCases['a refused switch']!],
      ['both refused', bothRefused],
    ])('%s: the right page\u2019s words equal the same part outside any shell', async (_name, c) => {
      const onPage = await show(c, true, true);
      expect(onPage.right).toBeDefined();
      const left = words(onPage.left!);
      const right = words(onPage.right!);
      onPage.unmount();
      core?.remove();
      expect(right).toEqual(without(await wordsOutside(c, true), left));
    });
  });

  describe('a day that ended while the check-in was open', () => {
    const DATE = 'Wednesday 30 September';
    const emptyDay = tonightCases['a day that ended while open']!;
    const keptDay: TonightCase = { ...tonightCases['an entry kept']!, endsWhileOpen: true };
    const typedDay: TonightCase = {
      ...tonightCases['reaches, no coverage note, quotes hidden']!,
      endsWhileOpen: true,
    };
    const TYPED = 'Written before midnight.';

    it('the heading becomes the date in words and the empty log says it too', async () => {
      const { left, main } = await show(emptyDay, true);
      expect(left).toBeDefined();
      const heading = within(left!).getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(DATE);
      expect(heading.textContent).toBe(DATE);
      expect(within(main).queryByText('Tonight')).toBeNull();
      expect(within(left!).getByText(`Nothing here for ${DATE}.`)).toHaveClass(
        'nb-checkin-empty',
      );
      expect(left!.textContent).not.toContain('today');
    });

    it('a kept entry reads "Kept for {date}." in the one region', async () => {
      const { right } = await show(keptDay, true, true);
      expect(right).toBeDefined();
      expect(right!.querySelector('[role="status"]')!.textContent).toBe(`Kept for ${DATE}.`);
    });

    it('the text typed before the day ended stays in the writing space', async () => {
      const { right, left } = await show(typedDay, true, false, TYPED);
      expect(left).toBeDefined();
      expect(within(left!).getByRole('heading', { level: 2 })).toHaveTextContent(DATE);
      const space = within(right!).getByLabelText('How the day went') as HTMLTextAreaElement;
      expect(space.value).toBe(TYPED);
    });

    it.each([
      ['an empty log', emptyDay, false, undefined],
      ['a kept entry', keptDay, true, undefined],
      ['text typed', typedDay, false, TYPED],
    ])('%s: the words equal the same state outside any shell', async (_name, c, perform, typed) => {
      const onPage = await show(c, true, perform, typed);
      expect(onPage.spread).not.toBeNull();
      const found = words(onPage.spread!);
      onPage.unmount();
      core?.remove();
      expect(found).toEqual(await wordsOutside(c, perform, typed));
    });
  });
});
