/**
 * The check-in says when Cairn started counting, on the first day only (slice `first-counted`, rule 9, scenario 36).
 *
 * The core is the IPC fake and the clock is Vitest's fake timers, as the check-in's other page tests have them.
 * Every expected string is made through the same call the screen makes.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DayView } from '../../ipc/journal';
import { clockTimeInWords } from '../../localDays';
import { CheckIn } from '../CheckIn';
import { installFakeCore, type FakeCore } from './fakeCore';
import { expectStartVoice, startSentences } from './startSentences';
import { evening, lateEvening, reachesOfTheDay, sealedSentence, tonightCore } from './tonightCases';

/** Wednesday 30 September 2026, 09:07: before the evening the check-in is opened in. */
const FIRST = Math.round(new Date(2026, 8, 30, 9, 7).getTime() / 1000);
/** The previous day: not the day the check-in opens on. */
const YESTERDAY = Math.round(new Date(2026, 8, 29, 9, 7).getTime() / 1000);

const day = (over: Partial<DayView> = {}): DayView => ({
  reaches: reachesOfTheDay,
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
  ...over,
});

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
  vi.useRealTimers();
});

async function open(view: DayView, at: Date = evening()) {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(at);
  core = installFakeCore(
    tonightCore({ day: view, quotesShown: false, quote: null }),
  );
  render(<CheckIn />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('the check-in names when Cairn started counting, on the first day only', () => {
  it('says the time and today, before the coverage note', async () => {
    await open(day({ first_counted: FIRST, coverage_note: 'Cairn was not counting for 2 hours.' }));

    const found = startSentences();
    expect(found).toHaveLength(1);
    expect(found[0]!.textContent).toBe(`Cairn started counting at ${clockTimeInWords(FIRST)} today.`);
    expect(found[0]).toHaveClass('nb-checkin-note');
    expectStartVoice(found[0]!.textContent!);
    const note = screen.getByText('Cairn was not counting for 2 hours.');
    expect(found[0]!.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('names the day once it has ended under the open check-in', async () => {
    await open(day({ first_counted: FIRST }), lateEvening());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    });

    const found = startSentences();
    expect(found).toHaveLength(1);
    expect(found[0]!.textContent).toBe(
      `Cairn started counting at ${clockTimeInWords(FIRST)} on Wednesday 30 September.`,
    );
    expectStartVoice(found[0]!.textContent!);
  });

  it.each([
    ['another day', day({ first_counted: YESTERDAY })],
    ['never counted', day({ first_counted: null })],
    ['no field', day()],
    ['a sealed answer', day({ first_counted: FIRST, reaches: [], sealed: sealedSentence })],
  ])('shows none for %s', async (_name, view) => {
    await open(view);

    // The page has opened: an open day offers its space, a sealed one says why it cannot.
    expect(screen.queryByRole('textbox') ?? screen.getByText(sealedSentence)).toBeInTheDocument();
    expect(startSentences()).toHaveLength(0);
  });
});
