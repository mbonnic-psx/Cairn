/// <reference types="vite/client" />
/**
 * Every control the setup spreads draw, rendered on a notebook page in every look (slice `setup-pages`,
 * T013–T014): each is reached by the keyboard and shows an outline of its own from the ink, and nothing on
 * the spreads fades. The core is a fake written in the test tree at the one seam the interface calls it through.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Disclosure } from '../../screens/Disclosure';
import { Categories } from '../../screens/Setup/Categories';
import { Choosing } from '../../screens/Setup/Choosing';
import { CustomEntry } from '../../screens/Setup/CustomEntry';
import { installFakeCore, never, type FakeCore } from '../../screens/__tests__/fakeCore';
import { categories, disclosures, localhostReason, waitingNote } from '../../screens/__tests__/setupCases';
import { NotebookShell } from '../../shell/NotebookShell';
import { contrastRatio } from '../contrast';
import type { NotebookLook } from '../look';

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const sheet = noComments(readFileSync('src/styles/setup-pages.css', 'utf8'));
const notebook = noComments(readFileSync('src/styles/notebook.css', 'utf8'));
const rules = [...sheet.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));

const LOOKS: NotebookLook[] = ['morning', 'midday', 'night'];
const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];
const noop = () => undefined;

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

/** The controls the on-page branches draw, by the class that carries each one's outline. */
const CONTROLS = [
  'nb-categories-box',
  'nb-custom-input',
  'nb-custom-button',
  'nb-choosing-turn-on',
  'nb-disclosure-confirm',
  'nb-disclosure-back',
];

const FOCUSABLE = 'input, button, select, textarea, a[href], [tabindex]';
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function onPage(ui: React.ReactElement, look: NotebookLook) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  return { ...view, main: view.container.querySelector('main') as HTMLElement };
}

/** Every state of every on-page branch, as a function that renders it in a look and returns the page area. */
const scenes: Record<string, (look: NotebookLook) => Promise<HTMLElement>> = {
  'the choosing step, with categories, a note and a reason': async (look) => {
    core = installFakeCore({
      add_custom_entry: () => {
        throw { reason: localhostReason, kind: 'keeps_the_machine_working' };
      },
    });
    const { main } = onPage(<Choosing categories={categories} onToggle={noop} note={waitingNote} onTurnOn={noop} />, look);
    await userEvent.type(screen.getByLabelText('Address to protect'), 'localhost');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    await within(main).findByRole('status');
    return main;
  },
  'the choosing step, with an address added': async (look) => {
    core = installFakeCore({ add_custom_entry: () => ['example.com', 'www.example.com'], get_protection_state: () => ({ status: 'off', since: null, verified_at: null, entry_count_verified: 0 }) });
    const { main } = onPage(<Choosing categories={categories} onToggle={noop} onTurnOn={noop} />, look);
    await userEvent.type(screen.getByLabelText('Address to protect'), 'example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    await within(main).findByText(/example\.com, www\.example\.com/);
    await userEvent.type(screen.getByLabelText('Address to protect'), 'more.example');
    return main;
  },
  'the choosing step, nothing typed': async (look) => onPage(<Choosing categories={categories} onToggle={noop} onTurnOn={noop} />, look).main,
  'Categories alone, with none': async (look) => onPage(<Categories categories={[]} onToggle={noop} />, look).main,
  'CustomEntry alone': async (look) => onPage(<CustomEntry add={async () => []} />, look).main,
  'Before Cairn changes anything, with its details': async (look) =>
    onPage(<Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />, look).main,
  'Before Cairn changes anything, loading': async (look) => {
    core = installFakeCore({ get_disclosures: never });
    const { main } = onPage(<Disclosure onConfirm={noop} onBack={noop} />, look);
    await settle();
    return main;
  },
  'Before Cairn changes anything, could not be read': async (look) => {
    core = installFakeCore({
      get_disclosures: () => {
        throw 'unreadable';
      },
    });
    const { main } = onPage(<Disclosure onConfirm={noop} onBack={noop} />, look);
    await settle();
    return main;
  },
};

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

describe.each(LOOKS)('focus on the paper, in the %s look (T013)', (look) => {
  it('holds --nb-ink at 3:1 on the paper, the colour every setup outline is drawn in', () => {
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
      const own = CONTROLS.filter((c) => control.classList.contains(c));
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
      }
      cleanup();
      core?.remove();
      core = undefined;
    }
    expect([...found].sort()).toEqual([...CONTROLS].sort());
  });
});

const FADES = /transition|duration-|animate-|settle/;

describe('nothing the setup spreads draw fades (T014)', () => {
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
    for (const make of [
      () => <Choosing categories={categories} onToggle={noop} note={waitingNote} onTurnOn={noop} />,
      () => <Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />,
    ]) {
      core = installFakeCore({});
      const { main, rerender } = onPage(make(), 'morning');
      const before = Array.from(main.querySelectorAll('*'));
      for (const look of ['midday', 'night', 'morning'] as const) {
        rerender(
          <NotebookShell tabs={tabs} onSelect={noop} look={look}>
            {make()}
          </NotebookShell>,
        );
        const after = Array.from(main.querySelectorAll('*'));
        expect(after).toHaveLength(before.length);
        after.forEach((el, i) => {
          expect(el, `${look}: element ${i}`).toBe(before[i]);
          expect(el.getAttribute('class') ?? '').not.toMatch(FADES);
        });
      }
      cleanup();
    }
  });
});
