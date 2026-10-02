/// <reference types="vite/client" />
/**
 * Under forced colours every control the setup and Protection spreads draw keeps a visible edge (loose-ends
 * T008; setup-pages T025, FR-022): each button, input, select and textarea either sets a border of at least
 * 1px in its sheet's base rules, or is named in that sheet's `@media (forced-colors: active)` block with one.
 * WebKit has no forced-colours mode, so this is a Windows promise held on every platform's CSS.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Disclosure } from '../../screens/Disclosure';
import { Protection } from '../../screens/Protection';
import { Choosing } from '../../screens/Setup/Choosing';
import { Trail } from '../../screens/Trail';
import { installFakeCore, never, type FakeCore } from '../../screens/__tests__/fakeCore';
import { cases as protectionCases, trailCases } from '../../screens/__tests__/pinCases';
import { categories, disclosures, localhostReason, waitingNote } from '../../screens/__tests__/setupCases';
import { NotebookShell } from '../../shell/NotebookShell';
import type { NotebookLook } from '../look';

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

interface Sheet {
  /** Rules outside any at-rule. */
  base: { selectors: string[]; body: string }[];
  /** Rules inside `@media (forced-colors: active)`. */
  forced: { selectors: string[]; body: string }[];
}

/** Splits a sheet into its top-level rules and its forced-colours block, by matching braces. */
function readSheet(path: string): Sheet {
  const css = noComments(readFileSync(path, 'utf8'));
  const sheet: Sheet = { base: [], forced: [] };
  const rulesIn = (text: string) =>
    [...text.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({
      selectors: m[1]!.split(',').map((s) => s.trim()),
      body: m[2]!,
    }));
  let rest = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media', i);
    if (at < 0) {
      rest += css.slice(i);
      break;
    }
    rest += css.slice(i, at);
    const open = css.indexOf('{', at);
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      if (css[j] === '}') depth -= 1;
      j += 1;
    }
    if (/forced-colors:\s*active/.test(css.slice(at, open))) sheet.forced.push(...rulesIn(css.slice(open + 1, j - 1)));
    i = j;
  }
  sheet.base.push(...rulesIn(rest));
  return sheet;
}

const SHEETS = [readSheet('src/styles/setup-pages.css'), readSheet('src/styles/protection-page.css')];

/** The widest border a rule body sets with `border` or `border-width` (never a side's), in px; 0 when none. */
const borderPx = (body: string): number => {
  const widths = [...body.matchAll(/(?:^|[;\s])border(?:-width)?:\s*(\d*\.?\d+)px/g)].map((m) => Number(m[1]));
  return widths.length ? widths[widths.length - 1]! : 0;
};
const widthFor = (rules: Sheet['base'], cls: string): number =>
  rules
    .filter((r) => r.selectors.includes(`.${cls}`))
    .reduce((last, r) => {
      const w = /(?:^|[;\s])border(?:-width)?:/.test(r.body) ? borderPx(r.body) : last;
      return w;
    }, 0);

/** The edge a control's class gets: from its sheet's base rules, or from the forced-colours block. */
function edge(cls: string): { base: number; forced: number; named: boolean } {
  let base = 0;
  let forced = 0;
  let named = false;
  for (const sheet of SHEETS) {
    base = Math.max(base, widthFor(sheet.base, cls));
    const f = widthFor(sheet.forced, cls);
    forced = Math.max(forced, f);
    named ||= sheet.forced.some((r) => r.selectors.includes(`.${cls}`));
  }
  return { base, forced, named };
}

const LOOKS: NotebookLook[] = ['morning', 'midday', 'night'];
const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];
const noop = () => undefined;
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

let core: FakeCore | undefined;
afterEach(() => {
  cleanup();
  core?.remove();
  core = undefined;
});

function onPage(ui: React.ReactElement, look: NotebookLook) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

const scenes: Record<string, (look: NotebookLook) => Promise<HTMLElement>> = {
  'choosing, categories with a note, an address added, a reason': async (look) => {
    core = installFakeCore({
      add_custom_entry: (args) => {
        if (args.input === 'localhost') throw { reason: localhostReason, kind: 'keeps_the_machine_working' };
        return ['example.com', 'www.example.com'];
      },
      get_protection_state: () => ({ status: 'off', since: null, verified_at: null, entry_count_verified: 0 }),
    });
    const main = onPage(<Choosing categories={categories} onToggle={noop} note={waitingNote} onTurnOn={noop} />, look);
    const input = screen.getByLabelText('Address to protect');
    await userEvent.type(input, 'example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    await within(main).findByText(/example\.com, www\.example\.com/);
    await userEvent.type(input, 'localhost');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    await within(main).findByRole('status');
    return main;
  },
  'disclosure, details fetched': async (look) =>
    onPage(<Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />, look),
  'disclosure, loading': async (look) => {
    core = installFakeCore({ get_disclosures: never });
    const main = onPage(<Disclosure onConfirm={noop} onBack={noop} />, look);
    await settle();
    return main;
  },
  'disclosure, unreadable': async (look) => {
    core = installFakeCore({
      get_disclosures: () => {
        throw 'unreadable';
      },
    });
    const main = onPage(<Disclosure onConfirm={noop} onBack={noop} />, look);
    await settle();
    return main;
  },
  ...Object.fromEntries(
    Object.entries(protectionCases).map(([name, c]) => [
      `protection, ${name}`,
      async (look: NotebookLook) => onPage(<Protection state={c.state} pending={c.pending} />, look),
    ]),
  ),
  'What is protected': async (look) => onPage(<Trail {...trailCases['list in force']!} />, look),
};

const CONTROLS = 'button, input, select, textarea';

describe('forced colours keep every control an edge', () => {
  describe.each(LOOKS)('in the %s look', (look) => {
    it.each(Object.keys(scenes))('%s', async (name) => {
      const main = await scenes[name]!(look);
      const controls = Array.from(main.querySelectorAll<HTMLElement>(CONTROLS));
      const bare: string[] = [];
      for (const control of controls) {
        const classes = Array.from(control.classList).filter((c) => c.startsWith('nb-'));
        expect(classes, `a control with no class of its own: ${control.outerHTML.slice(0, 80)}`).not.toHaveLength(0);
        const ok = classes.some((c) => {
          const e = edge(c);
          return e.base >= 1 || (e.named && e.forced >= 1);
        });
        if (!ok) bare.push(`.${classes.join('.')}`);
      }
      expect([...new Set(bare)], `${name}, ${look}: controls with no edge of 1px in forced colours`).toEqual([]);
    });
  });

  it('sees controls to hold: the sweep finds the spreads\' buttons and inputs', async () => {
    const found = new Set<string>();
    for (const name of Object.keys(scenes)) {
      const main = await scenes[name]!('morning');
      for (const el of Array.from(main.querySelectorAll<HTMLElement>(CONTROLS))) {
        el.classList.forEach((c) => c.startsWith('nb-') && found.add(c));
      }
      cleanup();
      core?.remove();
      core = undefined;
    }
    for (const needed of [
      'nb-choosing-turn-on',
      'nb-disclosure-confirm',
      'nb-disclosure-back',
      'nb-protection-note__button',
      'nb-custom-input',
      'nb-custom-button',
      'nb-categories-box',
    ]) {
      expect(found.has(needed), `${needed} is rendered by a scene`).toBe(true);
    }
  });
});
