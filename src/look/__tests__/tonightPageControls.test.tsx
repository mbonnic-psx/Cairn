/// <reference types="vite/client" />
/**
 * Every control the Today and Tonight spreads draw, rendered on a notebook page in every look (slice
 * `tonight-page`, T016–T017): each is reached by the keyboard and shows an outline of its own from the ink, and
 * nothing on the spreads fades. The core is a fake written in the test tree at the one seam the screens call it
 * through, and the Today reader is a plain object.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckIn } from '../../screens/CheckIn';
import { Reaches } from '../../screens/Reaches';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import {
  lateEvening,
  loadRefusal,
  overTimeCases,
  overTimeReader,
  quoteLine,
  saveRefusal,
  sealedSentence,
  silentReader,
  switchRefusal,
  todayCases,
  tonightCases,
  tonightCore,
} from '../../screens/__tests__/tonightCases';
import { NotebookShell } from '../../shell/NotebookShell';
import { contrastRatio } from '../contrast';
import type { NotebookLook } from '../look';

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const sheet = noComments(readFileSync('src/styles/tonight-page.css', 'utf8'));
const notebook = noComments(readFileSync('src/styles/notebook.css', 'utf8'));
const rules = [...sheet.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));

const LOOKS: NotebookLook[] = ['morning', 'midday', 'night'];
const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];
const noop = () => undefined;

let core: FakeCore | undefined;
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  core?.remove();
  core = undefined;
});

/** The controls the spreads draw, by the class that carries each one's outline, and what each is. */
const CONTROLS: Record<string, string> = {
  'nb-reaches-which__button': 'the Which days buttons, Today and Over time',
  'nb-reaches-date': 'the From and To boxes',
  'nb-checkin-write': 'the writing space',
  'nb-checkin-keep': 'Keep this',
  'nb-checkin-switch': 'the quotes switch',
};

const FOCUSABLE = 'input, button, select, textarea, a[href], [tabindex]';

/** What a scene must show before anything is asserted over it: a text, a typed value, or the bars of a list. */
type Marker = string | { value: string } | { bars: true };

/**
 * Waits for the marker of the state a scene names, and fails by the scene's name when it never comes: a scene
 * that rendered some other state fails here, not as a pass over the wrong markup.
 */
async function showing(scene: string, main: HTMLElement, marker: Marker): Promise<void> {
  const seen =
    typeof marker === 'string'
      ? within(main).findAllByText(marker)
      : 'value' in marker
        ? within(main).findAllByDisplayValue(marker.value)
        : within(main).findAllByTestId('bar');
  await seen.catch(() => {
    throw new Error(`scene "${scene}" never showed ${JSON.stringify(marker)}`);
  });
}

const todayMarkers: Record<string, Marker> = {
  looking: 'Looking…',
  'a log, the fallback note': 'news.example',
  'a log, a coverage note': 'news.example',
  'nothing yet, the fallback note': 'Nothing here for today.',
  'nothing yet, a coverage note': 'Nothing here for today.',
  sealed: sealedSentence,
};
const overTimeMarkers: Record<string, Marker> = {
  looking: 'Looking…',
  'could not read': 'Cairn could not read your history just now. Protection is unaffected.',
  sealed: sealedSentence,
  'a list': { bars: true },
  'a list, a coverage note': { bars: true },
  'a list, one estimate': { bars: true },
  'a list, a coverage note and several estimates': { bars: true },
  'nothing here': 'Nothing here for these days.',
  'nothing here, a coverage note and several estimates': 'Nothing here for these days.',
};
const tonightMarkers: Record<string, Marker> = {
  looking: 'Looking…',
  'a load that could not be made': loadRefusal,
  'reaches, no coverage note, quotes hidden': 'news.example',
  'no reaches, no coverage note, quotes hidden': 'Nothing here for today.',
  'reaches, a coverage note, quotes hidden': 'news.example',
  'no reaches, a coverage note, quotes hidden': 'Nothing here for today.',
  'reaches, with a quote': quoteLine,
  'reaches, quotes shown and none to be had': 'Hide quotes',
  'reaches, the quotes setting unknown': 'news.example',
  'an entry written before': { value: 'A slow morning, a better afternoon.' },
  'an entry kept': 'Kept for today.',
  'a refused save': saveRefusal,
  'a refused switch': switchRefusal,
  'sealed, quotes hidden': sealedSentence,
  'sealed, with a quote': sealedSentence,
  'a day that ended while open': 'Wednesday 30 September',
};

function onPage(ui: React.ReactElement, look: NotebookLook) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return { ...view, main: view.container.querySelector('main') as HTMLElement };
}

async function tonight(name: string, look: NotebookLook): Promise<HTMLElement> {
  const c = tonightCases[name]!;
  const scene = `Tonight: ${name}`;
  const marker = tonightMarkers[name];
  if (!marker) throw new Error(`scene "${scene}" names no marker`);
  if (c.endsWhileOpen) {
    // Opened ten minutes before the day ends, then the clock moves past it, as CheckInPage.test.tsx does.
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(lateEvening());
  }
  core = installFakeCore(tonightCore(c));
  const { main } = onPage(<CheckIn />, look);
  if (c.endsWhileOpen) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    });
    // The rest of the scene runs on the real clock; the day stays ended on it.
    vi.useRealTimers();
    if (!within(main).queryByRole('heading', { name: marker as string })) {
      throw new Error(`scene "${scene}" never showed ${JSON.stringify(marker)}`);
    }
  } else if (!c.keep && !c.switchRefused) {
    await showing(scene, main, marker);
  } else {
    // What the person does needs the loaded check-in under it: the heading, or the writing space.
    await within(main).findByRole('textbox').catch(() => {
      throw new Error(`scene "${scene}" never showed the writing space`);
    });
  }
  const write = main.querySelector('textarea');
  if (write) fireEvent.change(write, { target: { value: c.keep?.typed ?? 'A few words.' } });
  if (c.keep) {
    fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
    await showing(scene, main, marker);
  }
  if (c.switchRefused) {
    fireEvent.click(screen.getByRole('button', { name: 'Hide quotes' }));
    await showing(scene, main, marker);
  }
  return main;
}

/** Every state of both spreads, as a function that renders it in a look and returns the page area. */
const scenes: Record<string, (look: NotebookLook) => Promise<HTMLElement>> = {};
for (const name of Object.keys(todayCases)) {
  scenes[`Today, Today view: ${name}`] = async (look) => {
    const { main } = onPage(<Reaches today={todayCases[name]} read={silentReader} />, look);
    await showing(`Today, Today view: ${name}`, main, todayMarkers[name]!);
    return main;
  };
}
for (const name of Object.keys(overTimeCases)) {
  scenes[`Today, Over time: ${name}`] = async (look) => {
    const { main } = onPage(<Reaches today={todayCases['a log, the fallback note']} read={overTimeReader(overTimeCases[name]!)} />, look);
    await userEvent.click(screen.getByRole('button', { name: 'Over time' }));
    await showing(`Today, Over time: ${name}`, main, overTimeMarkers[name]!);
    return main;
  };
}
for (const name of Object.keys(tonightCases)) {
  scenes[`Tonight: ${name}`] = (look) => tonight(name, look);
}

const lookBlock = (look: string) => notebook.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
const token = (name: string, look: string) => lookBlock(look).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))![1]!;

const focusRule = (name: string) =>
  rules.filter((r) => r.selector.split(',').map((x) => x.trim()).includes(`.${name}:focus-visible`)).map((r) => r.body).join('');

/** Tab from the top of the document through every stop, and say which elements were reached. */
async function reachedByTab(root: HTMLElement): Promise<Set<Element>> {
  const reached = new Set<Element>();
  const total = document.querySelectorAll(FOCUSABLE).length;
  (document.activeElement as HTMLElement | null)?.blur();
  for (let i = 0; i < total + 2; i += 1) {
    await userEvent.tab();
    if (root.contains(document.activeElement)) reached.add(document.activeElement!);
  }
  return reached;
}

describe.each(LOOKS)('focus on the paper, in the %s look (T016)', (look) => {
  it('holds --nb-ink at 3:1 on the paper, the colour every outline here is drawn in', () => {
    expect(contrastRatio(token('--nb-ink', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.keys(scenes))('%s: every control is reached by Tab and carries an outline of its own', async (name) => {
    const main = await scenes[name]!(look);
    const controls = Array.from(main.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !(el as HTMLButtonElement).disabled,
    );
    const reached = await reachedByTab(main);
    for (const control of controls) {
      expect(reached.has(control), `${control.outerHTML.slice(0, 80)} is not reached by Tab`).toBe(true);
      const own = Object.keys(CONTROLS).filter((c) => control.classList.contains(c));
      expect(own, `${control.outerHTML.slice(0, 80)} carries no control class the sweep knows`).toHaveLength(1);
      const rule = focusRule(own[0]!);
      expect(rule, `no :focus-visible rule for .${own[0]}`).toMatch(/outline:\s*2px solid var\(--nb-ink\)/);
      expect(rule, own[0]).toMatch(/outline-offset:\s*2px/);
      expect(control.className).not.toMatch(/focus:border-clay-500|focus:outline-none/);
    }
  });

  it('names every control the spreads draw, so a new one with no rule fails', async () => {
    const found = new Set<string>();
    for (const name of Object.keys(scenes)) {
      const main = await scenes[name]!(look);
      for (const el of Array.from(main.querySelectorAll<HTMLElement>(FOCUSABLE))) {
        for (const c of el.classList) if (c.startsWith('nb-')) found.add(c);
        expect(el.className, `${el.outerHTML.slice(0, 60)} has no class`).toMatch(/\bnb-/);
        expect(el.className).not.toMatch(/focus:border-clay-500|focus:outline-none/);
      }
      cleanup();
      core?.remove();
      core = undefined;
    }
    expect([...found].sort()).toEqual(Object.keys(CONTROLS).sort());
  });
});

const FADES = /transition|duration-|animate-|settle/;

describe('nothing the Today and Tonight spreads draw fades (T017)', () => {
  it('declares no transition, animation or keyframes anywhere in the sheet, nor a rule for a fading class', () => {
    expect(sheet).not.toMatch(/transition|animation|@keyframes/);
    for (const { selector } of rules) expect(selector).not.toMatch(FADES);
  });

  describe.each(LOOKS)('in the %s look', (look) => {
    it.each(Object.keys(scenes))('%s: no element carries a fading class', async (name) => {
      const main = await scenes[name]!(look);
      const all = Array.from(main.querySelectorAll('*'));
      expect(all.length).toBeGreaterThan(0);
      for (const el of all) {
        expect(el.getAttribute('class') ?? '', el.outerHTML.slice(0, 80)).not.toMatch(FADES);
      }
    });
  });

  it('leaves every element the same node, with no fading class added, when the look changes', async () => {
    const pairs: [string, () => React.ReactElement, (main: HTMLElement) => Promise<void>][] = [
      [
        'Today',
        () => <Reaches today={todayCases['a log, the fallback note']} read={silentReader} />,
        (main) => showing('Today', main, 'news.example'),
      ],
      [
        'Over time',
        () => <Reaches today={todayCases['a log, the fallback note']} read={overTimeReader(overTimeCases['a list']!)} />,
        async (main) => {
          await userEvent.click(screen.getByRole('button', { name: 'Over time' }));
          await showing('Over time', main, { bars: true });
        },
      ],
      ['Tonight', () => <CheckIn />, (main) => showing('Tonight', main, quoteLine)],
    ];
    for (const [name, make, enter] of pairs) {
      core = installFakeCore(tonightCore(tonightCases['reaches, with a quote']!));
      const { main, rerender } = onPage(make(), 'morning');
      await enter(main);
      const write = main.querySelector('textarea');
      if (write) fireEvent.change(write, { target: { value: 'Typed before the look changed.' } });
      const before = Array.from(main.querySelectorAll('*'));
      expect(before.length).toBeGreaterThan(0);
      for (const look of ['midday', 'night', 'morning'] as const) {
        rerender(
          <NotebookShell tabs={tabs} onSelect={noop} look={look}>
            {make()}
          </NotebookShell>,
        );
        const after = Array.from(main.querySelectorAll('*'));
        expect(after, `${name} in ${look}`).toHaveLength(before.length);
        after.forEach((el, i) => {
          expect(el, `${name} in ${look}: element ${i}`).toBe(before[i]);
          expect(el.getAttribute('class') ?? '').not.toMatch(FADES);
        });
        if (write) expect((main.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Typed before the look changed.');
      }
      cleanup();
      core.remove();
      core = undefined;
    }
  });
});
